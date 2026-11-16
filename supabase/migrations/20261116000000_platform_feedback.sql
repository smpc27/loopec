-- Migration: Platform Feedbacks & Trade/Giveaway Support
create table if not exists public.platform_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  college_id uuid references public.colleges(id) on delete cascade,
  category text not null check (category in ('feature_request', 'trade_barter', 'giveaway', 'bug', 'general')),
  rating smallint not null check (rating between 1 and 5),
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 3000),
  is_anonymous boolean not null default false,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_feedbacks_college_idx on public.platform_feedbacks(college_id, created_at desc);
create index if not exists platform_feedbacks_category_idx on public.platform_feedbacks(category, created_at desc);

-- Enable RLS
alter table public.platform_feedbacks enable row level security;

-- Policies
create policy "Authenticated members can insert feedback"
  on public.platform_feedbacks for insert
  to authenticated
  with check (true);

create policy "Admins can view feedback for their college"
  on public.platform_feedbacks for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (profiles.role in ('college_admin', 'super_admin'))
    )
  );
