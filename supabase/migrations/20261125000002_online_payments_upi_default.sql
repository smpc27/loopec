-- Migration: remove Razorpay default from confirm_online_payment RPC
-- Sets the default provider to 'direct_upi' and clarifies comments.

create or replace function public.confirm_online_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_provider_order_id text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.orders%rowtype;
  payment_item public.payments%rowtype;
  actor_id uuid := (select auth.uid());
  trusted_service boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
  clean_payment_id text := trim(coalesce(p_provider_payment_id, ''));
  clean_order_id text := nullif(trim(coalesce(p_provider_order_id, '')), '');
  clean_provider text := lower(trim(coalesce(p_provider, 'direct_upi')));
begin
  if clean_payment_id = '' then
    raise exception 'A valid payment reference ID is required';
  end if;

  select * into item from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if not trusted_service and actor_id is distinct from item.buyer_id and not app_private.is_college_admin(item.college_id) then
    raise exception 'Unauthorized to confirm payment for this order';
  end if;

  if item.status not in ('pending', 'accepted', 'payment_pending') then
    if item.status = 'paid' then
      return item;
    end if;
    raise exception 'Order is not in a payable state (status: %)', item.status;
  end if;

  select * into payment_item from public.payments
  where order_id = item.id
  order by created_at desc limit 1 for update;

  if not found then
    insert into public.payments (
      order_id, provider, method, status, amount, currency,
      idempotency_key, provider_payment_id, provider_order_id, verified_at
    ) values (
      item.id, clean_provider, 'online', 'paid', item.total_amount, item.currency,
      'pay:' || clean_provider || ':' || clean_payment_id, clean_payment_id, clean_order_id, now()
    ) returning * into payment_item;
  else
    update public.payments
    set provider = clean_provider,
        method = 'online',
        status = 'paid',
        provider_payment_id = clean_payment_id,
        provider_order_id = coalesce(clean_order_id, provider_order_id),
        verified_at = now(),
        updated_at = now()
    where id = payment_item.id returning * into payment_item;
  end if;

  perform set_config('app.order_transition', 'allowed', true);
  update public.orders
  set status = 'paid', updated_at = now()
  where id = item.id returning * into item;
  perform set_config('app.order_transition', '', true);

  insert into public.transactions (
    order_id, payment_id, transaction_type, gross_amount,
    commission_amount, seller_net_amount, currency, idempotency_key
  ) values (
    item.id, payment_item.id, 'payment', payment_item.amount,
    item.commission_amount, greatest(payment_item.amount - item.commission_amount, 0),
    payment_item.currency, 'payment:' || payment_item.id::text
  ) on conflict (idempotency_key) do nothing;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (
    actor_id, 'online_payment_confirmed', 'order', item.id,
    jsonb_build_object('status', 'accepted', 'provider', clean_provider),
    jsonb_build_object('status', 'paid', 'payment_id', payment_item.id, 'provider_payment_id', clean_payment_id)
  );

  insert into public.notifications (user_id, kind, title, body, payload)
  values (
    item.seller_id, 'order_status', 'Payment received',
    'Payment for order ' || left(item.id::text, 8) || ' has been confirmed. Please prepare the item for campus pickup.',
    jsonb_build_object('order_id', item.id, 'status', 'paid')
  );

  insert into public.notifications (user_id, kind, title, body, payload)
  values (
    item.buyer_id, 'order_status', 'Payment successful',
    'Your payment for order ' || left(item.id::text, 8) || ' was confirmed. The seller is preparing the campus pickup.',
    jsonb_build_object('order_id', item.id, 'status', 'paid')
  );

  return item;
end;
$$;

revoke all on function public.confirm_online_payment(uuid, text, text, text) from public, anon;
grant execute on function public.confirm_online_payment(uuid, text, text, text) to authenticated;
