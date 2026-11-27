-- Migration: fix confirm_online_payment check constraint/column bugs and harden platform_feedbacks grants & RLS
-- Idempotent for both fresh migration runs and existing hosted databases.

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
  clean_provider text := coalesce(nullif(lower(trim(coalesce(p_provider, ''))), ''), 'direct_upi');
  previous_status public.order_status;
begin
  if clean_payment_id = '' then
    raise exception 'A valid payment reference ID is required';
  end if;

  select * into item from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if not trusted_service
     and not (actor_id = item.buyer_id and app_private.is_approved_member(item.college_id))
     and not app_private.is_college_admin(item.college_id) then
    raise exception 'Unauthorized to confirm payment for this order';
  end if;

  if item.status = 'paid' then
    return item;
  end if;

  if item.status not in ('accepted', 'payment_pending') then
    raise exception 'Order is not in a payable state (status: %)', item.status;
  end if;

  previous_status := item.status;

  select * into payment_item from public.payments
  where order_id = item.id
  order by created_at desc limit 1 for update;

  if not found then
    insert into public.payments (
      order_id, provider, method, status, amount, currency,
      idempotency_key, provider_payment_id, verified_at
    ) values (
      item.id, clean_provider, 'upi_provider', 'paid', item.total_amount, item.currency,
      'pay:' || clean_provider || ':' || item.id::text || ':' || clean_payment_id, clean_payment_id, now()
    ) returning * into payment_item;
  else
    update public.payments
    set provider = clean_provider,
        method = 'upi_provider',
        status = 'paid',
        provider_payment_id = clean_payment_id,
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
    jsonb_build_object('status', previous_status, 'provider', clean_provider, 'order_reference', nullif(trim(coalesce(p_provider_order_id, '')), '')),
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
grant execute on function public.confirm_online_payment(uuid, text, text, text) to authenticated, service_role;

-- Harden platform_feedbacks grants and RLS
alter table public.platform_feedbacks enable row level security;
revoke all on public.platform_feedbacks from public, anon;
grant select, insert on public.platform_feedbacks to authenticated;
grant all on public.platform_feedbacks to service_role;

drop policy if exists "Authenticated members can insert feedback" on public.platform_feedbacks;
create policy "Authenticated members can insert feedback"
  on public.platform_feedbacks for insert
  to authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.verification_status = 'approved'
        and p.suspended_at is null
        and (college_id is null or p.college_id = college_id)
    )
  );

drop policy if exists "Admins can view feedback for their college" on public.platform_feedbacks;
create policy "Admins can view feedback for their college"
  on public.platform_feedbacks for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('college_admin', 'super_admin')
        and p.verification_status = 'approved'
        and p.suspended_at is null
        and (p.role = 'super_admin' or p.college_id = platform_feedbacks.college_id)
    )
  );
