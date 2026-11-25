-- Migration: seller_dashboard_metrics RPC
-- Creates a function that returns aggregated seller metrics for the authenticated user.

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
    -- Listings
    coalesce((
      select count(*) from public.products p where p.seller_id = actor_id
    ), 0)::bigint as total_listings,

    coalesce((
      select count(*) from public.products p
      where p.seller_id = actor_id and p.status = 'approved'
    ), 0)::bigint as active_listings,

    coalesce((
      select count(*) from public.products p
      where p.seller_id = actor_id and p.status = 'pending'
    ), 0)::bigint as pending_listings,

    -- Orders (as seller)
    coalesce((
      select count(*) from public.orders o
      where o.seller_id = actor_id
        and o.status in ('pending', 'accepted', 'payment_pending', 'paid', 'ready_for_pickup')
    ), 0)::bigint as pending_orders,

    coalesce((
      select count(*) from public.orders o
      where o.seller_id = actor_id and o.status = 'completed'
    ), 0)::bigint as completed_orders,

    -- Revenue: sum of completed/paid orders
    coalesce((
      select sum(o.total_amount) from public.orders o
      where o.seller_id = actor_id
        and o.status in ('paid', 'ready_for_pickup', 'completed')
    ), 0)::numeric as paid_sales,

    -- Reviews received as seller
    coalesce((
      select count(*) from public.reviews r where r.reviewed_user_id = actor_id
    ), 0)::bigint as review_count,

    coalesce((
      select avg(r.rating)::numeric(4,2) from public.reviews r
      where r.reviewed_user_id = actor_id
    ), 0)::numeric as average_rating;
end;
$$;

-- Strip any existing public/anon grants first
revoke all on function public.seller_dashboard_metrics() from public, anon;

-- Only authenticated members can call it; function runs as definer to bypass RLS
grant execute on function public.seller_dashboard_metrics() to authenticated;
