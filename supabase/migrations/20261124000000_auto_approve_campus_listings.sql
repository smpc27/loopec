-- ==============================================================================
-- LOOPEC: AUTO-APPROVE VERIFIED CAMPUS MEMBERS' LISTINGS
-- Allows items submitted by verified college members to be live immediately.
-- ==============================================================================

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

-- Promote all currently pending products from verified campus members to approved
update public.products
set status = 'approved',
    published_at = coalesce(published_at, now()),
    updated_at = now()
where status = 'pending';
