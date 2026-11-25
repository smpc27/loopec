-- ==============================================================================
-- LOOPEC: ONE-SHOT MISSING UPDATES SCRIPT
-- Run this once in the Supabase SQL Editor (Project Owner) to apply:
--   1. profiles.upi_id column + authenticated UPDATE grant
--   2. confirm_online_payment() RPC (default provider = 'direct_upi')
--   3. Auto-approve submit_product() RPC & approve pending campus listings
--   4. Updated seller_dashboard_metrics() RPC
--   5. Seed NIT Calicut official campus pickup locations
-- ==============================================================================

begin;

-- 1. Seller UPI ID column + permission grant
alter table public.profiles add column if not exists upi_id text;
grant update (upi_id) on public.profiles to authenticated;

-- 2. Direct UPI / Campus Sandbox payment confirmation RPC
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

-- 3. Auto-approve verified campus members' listings
create or replace function public.submit_product(p_product_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_item public.products%rowtype;
begin
  if v_actor is null then
    raise exception 'A signed-in member is required';
  end if;

  select * into v_item
  from public.products
  where id = p_product_id;

  if not found or v_item.seller_id <> v_actor then
    raise exception 'Product cannot be submitted';
  end if;

  if not app_private.is_approved_member(v_item.college_id) then
    raise exception 'Seller is not an approved campus member';
  end if;

  update public.products
  set status = 'approved',
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = p_product_id;
end;
$$;

revoke all on function public.submit_product(uuid) from public, anon;
grant execute on function public.submit_product(uuid) to authenticated;

update public.products
set status = 'approved',
    published_at = coalesce(published_at, now()),
    updated_at = now()
where status = 'pending';

-- 4. Updated seller_dashboard_metrics RPC
create or replace function public.seller_dashboard_metrics()
returns table (
  total_listings   bigint,
  active_listings  bigint,
  pending_listings bigint,
  pending_orders   bigint,
  completed_orders bigint,
  paid_sales       numeric,
  review_count     bigint,
  average_rating   numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    coalesce((select count(*) from public.products p where p.seller_id = actor_id), 0)::bigint,
    coalesce((select count(*) from public.products p where p.seller_id = actor_id and p.status = 'approved'), 0)::bigint,
    coalesce((select count(*) from public.products p where p.seller_id = actor_id and p.status = 'pending'), 0)::bigint,
    coalesce((select count(*) from public.orders o where o.seller_id = actor_id and o.status in ('pending', 'accepted', 'payment_pending', 'paid', 'ready_for_pickup')), 0)::bigint,
    coalesce((select count(*) from public.orders o where o.seller_id = actor_id and o.status = 'completed'), 0)::bigint,
    coalesce((select sum(o.total_amount) from public.orders o where o.seller_id = actor_id and o.status in ('paid', 'ready_for_pickup', 'completed')), 0)::numeric,
    coalesce((select count(*) from public.reviews r where r.reviewed_user_id = actor_id), 0)::bigint,
    coalesce((select avg(r.rating)::numeric(4,2) from public.reviews r where r.reviewed_user_id = actor_id), 0)::numeric;
end;
$$;

revoke all on function public.seller_dashboard_metrics() from public, anon;
grant execute on function public.seller_dashboard_metrics() to authenticated;

-- 5. Official NIT Calicut campus pickup locations
insert into public.pickup_locations (id, college_id, name, address, instructions, sort_order, is_active)
values
  ('35b88dad-65f3-4cd6-b44d-c7d2fda7711b', '35b88dad-65f3-4cd6-b44d-c7d2fda7711a', 'Mega Mess 1 & 2 Courtyard', 'Central Dining Complex, NIT Calicut Campus', 'Meet outside main lobby entrance under the roof.', 10, true),
  ('35b88dad-65f3-4cd6-b44d-c7d2fda7711c', '35b88dad-65f3-4cd6-b44d-c7d2fda7711a', 'Student Activity Centre (SAC)', 'Near Basketball Court, NIT Calicut Campus', 'Meet at the main reception steps.', 20, true),
  ('35b88dad-65f3-4cd6-b44d-c7d2fda7711d', '35b88dad-65f3-4cd6-b44d-c7d2fda7711a', 'Central Library Entrance', 'Academic Complex, NIT Calicut Campus', 'Meet at the ground floor foyer near turnstiles.', 30, true),
  ('35b88dad-65f3-4cd6-b44d-c7d2fda7711e', '35b88dad-65f3-4cd6-b44d-c7d2fda7711a', 'MBH (Mega Boys Hostel) Gate', 'Hostel Zone, NIT Calicut Campus', 'Meet at the security checkpoint gate.', 40, true),
  ('35b88dad-65f3-4cd6-b44d-c7d2fda7711f', '35b88dad-65f3-4cd6-b44d-c7d2fda7711a', 'Ladies Hostel (LH) Gate', 'Ladies Hostel Complex, NIT Calicut Campus', 'Meet at visitor reception area.', 50, true)
on conflict (id) do update
set name = excluded.name,
    address = excluded.address,
    instructions = excluded.instructions,
    is_active = true;

commit;
