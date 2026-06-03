-- RentSafe V3.5 Migration
-- Run in Supabase SQL Editor

-- 1. Analytics events
create table if not exists public.analytics_events (
  id           uuid primary key default gen_random_uuid(),
  agreement_id uuid,
  user_id      uuid,
  event_name   text not null,
  metadata     jsonb default '{}',
  created_at   timestamptz default now()
);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name);
create index if not exists analytics_events_created_idx on public.analytics_events(created_at);
grant all on public.analytics_events to anon, authenticated;
create policy "public_analytics" on public.analytics_events for all to anon using (true) with check (true);
create policy "auth_analytics" on public.analytics_events for all to authenticated using (true) with check (true);
alter table public.analytics_events enable row level security;

-- 2. Protection scores
create table if not exists public.protection_scores (
  id                           uuid primary key default gen_random_uuid(),
  agreement_id                 uuid references public.agreements(id) on delete cascade,
  score                        integer,
  room_coverage_percent        numeric,
  asset_coverage_percent       numeric,
  photo_coverage_percent       numeric,
  walkthrough_video_present    boolean default false,
  estimated_recovery_confidence text,
  generated_at                 timestamptz default now()
);
grant all on public.protection_scores to anon, authenticated;
create policy "public_protection_scores" on public.protection_scores for all to anon using (true) with check (true);
create policy "auth_protection_scores" on public.protection_scores for all to authenticated using (true) with check (true);
alter table public.protection_scores enable row level security;

-- 3. Walkthrough video columns on agreements
alter table public.agreements add column if not exists walkthrough_video_url text;
alter table public.agreements add column if not exists walkthrough_video_uploaded_at timestamptz;

-- 4. Utility settlements
create table if not exists public.utility_settlements (
  id               uuid primary key default gen_random_uuid(),
  agreement_id     uuid references public.agreements(id) on delete cascade,
  electricity_due  numeric(12,2) default 0,
  water_due        numeric(12,2) default 0,
  maintenance_due  numeric(12,2) default 0,
  gas_due          numeric(12,2) default 0,
  other_due        numeric(12,2) default 0,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
grant all on public.utility_settlements to anon, authenticated;
create policy "public_utility_settlements" on public.utility_settlements for all to anon using (true) with check (true);
create policy "auth_utility_settlements" on public.utility_settlements for all to authenticated using (true) with check (true);
alter table public.utility_settlements enable row level security;
