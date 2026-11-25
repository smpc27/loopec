-- Migration: grant missing upi_id update permission on profiles table
-- The upi_id column was added in a previous migration but the column-level
-- grant was not included in the original grant list for authenticated users.

grant update (upi_id) on public.profiles to authenticated;
