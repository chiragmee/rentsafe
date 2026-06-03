-- ============================================================
-- RentSafe — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ============================================================
-- TABLE: agreements
-- ============================================================
create table if not exists public.agreements (
  id                      uuid primary key default gen_random_uuid(),
  tenant_name             text,
  tenant_phone            text,
  owner_name              text,
  owner_phone             text,
  property_address        text,
  property_state          text,
  monthly_rent            numeric(12, 2),
  deposit_amount          numeric(12, 2),
  tenure_start_date       date,
  tenure_months           integer,
  rent_escalation_percent numeric(5, 2),
  escalation_trigger      text,
  notice_period_days      integer,
  compliance_flags        jsonb    default '[]',
  raw_agreement_text      text,
  parsed_at               timestamptz default now(),
  created_at              timestamptz default now()
);

-- ============================================================
-- TABLE: assets
-- ============================================================
create table if not exists public.assets (
  id                          uuid primary key default gen_random_uuid(),
  agreement_id                uuid not null references public.agreements(id) on delete cascade,
  item_name                   text not null,
  tier                        integer not null check (tier in (1, 2, 3)),
  category                    text check (category in ('Furniture', 'Electrical', 'Fixtures', 'Plumbing', 'Keys', 'Other')),
  quantity                    integer default 1,

  -- Move-in state (tenant fills)
  condition_at_movein         text check (condition_at_movein in ('Good', 'Damaged', 'Missing')),
  move_in_photos              jsonb    default '[]',
  move_in_notes               text,

  -- Costs (owner fills)
  replacement_cost            numeric(12, 2),
  repair_cost                 numeric(12, 2),
  market_rate_min             numeric(12, 2),
  market_rate_max             numeric(12, 2),
  depreciation_rate_percent   numeric(5, 2),
  salvage_value_floor_percent numeric(5, 2) default 10,
  owner_cost_filled           boolean  default false,

  -- Tenant verification
  tenant_approved             boolean  default false,
  tenant_disputed             boolean  default false,
  dispute_note                text,
  agreed_cost                 numeric(12, 2),

  -- Move-out state
  condition_at_moveout        text check (condition_at_moveout in ('Good', 'Damaged', 'Missing')),
  move_out_photos             jsonb    default '[]',
  final_charge                numeric(12, 2),

  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

create index if not exists assets_agreement_id_idx on public.assets(agreement_id);
create index if not exists assets_tier_idx on public.assets(agreement_id, tier);

-- ============================================================
-- TABLE: room_conditions
-- ============================================================
create table if not exists public.room_conditions (
  id                   uuid primary key default gen_random_uuid(),
  agreement_id         uuid not null references public.agreements(id) on delete cascade,
  room_name            text not null,

  -- Move-in
  condition_at_movein  text check (condition_at_movein in ('Good', 'Minor Issues', 'Major Issues')),
  move_in_notes        text,
  move_in_photos       jsonb default '[]',

  -- Move-out
  condition_at_moveout text check (condition_at_moveout in ('Good', 'Minor Issues', 'Major Issues')),
  move_out_photos      jsonb default '[]',
  move_out_notes       text,

  owner_disputed       boolean default false,
  dispute_note         text,

  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists room_conditions_agreement_id_idx on public.room_conditions(agreement_id);

-- ============================================================
-- TABLE: signatures
-- ============================================================
create table if not exists public.signatures (
  agreement_id           uuid primary key references public.agreements(id) on delete cascade,

  tenant_signed          boolean     default false,
  tenant_signed_at       timestamptz,

  owner_signed           boolean     default false,
  owner_signed_at        timestamptz,

  owner_notified_at      timestamptz,
  owner_reminder_sent_at timestamptz,

  -- Draft | Pending Owner | Locked | Owner Non-Responsive
  registry_status        text        default 'Draft',
  registry_locked_at     timestamptz,

  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ============================================================
-- TABLE: settlements
-- ============================================================
create table if not exists public.settlements (
  agreement_id                uuid primary key references public.agreements(id) on delete cascade,
  total_deposit               numeric(12, 2),
  last_month_rent_deducted    numeric(12, 2),
  total_damage_charges        numeric(12, 2),
  total_asset_value           numeric(12, 2),
  refundable_amount           numeric(12, 2),
  amount_owed_beyond_deposit  numeric(12, 2),
  line_items                  jsonb default '[]',
  disputed_items              jsonb default '[]',
  generated_at                timestamptz default now(),
  settled_at                  timestamptz,
  updated_at                  timestamptz default now()
);


-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger assets_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create or replace trigger room_conditions_updated_at
  before update on public.room_conditions
  for each row execute function public.set_updated_at();

create or replace trigger signatures_updated_at
  before update on public.signatures
  for each row execute function public.set_updated_at();

create or replace trigger settlements_updated_at
  before update on public.settlements
  for each row execute function public.set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- RentSafe has no auth — all rows are publicly accessible
-- by anyone who knows the agreement UUID.
-- The UUID itself is the access token.
-- ============================================================
alter table public.agreements      enable row level security;
alter table public.assets          enable row level security;
alter table public.room_conditions enable row level security;
alter table public.signatures      enable row level security;
alter table public.settlements     enable row level security;

-- anon role can read/write everything (UUID = access control)
create policy "public_agreements" on public.agreements
  for all to anon using (true) with check (true);

create policy "public_assets" on public.assets
  for all to anon using (true) with check (true);

create policy "public_room_conditions" on public.room_conditions
  for all to anon using (true) with check (true);

create policy "public_signatures" on public.signatures
  for all to anon using (true) with check (true);

create policy "public_settlements" on public.settlements
  for all to anon using (true) with check (true);


-- ============================================================
-- STORAGE BUCKET: rentsafe-photos
-- Run this AFTER creating the bucket in the Supabase dashboard
-- (Storage → New bucket → name: rentsafe-photos → Public: ON)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('rentsafe-photos', 'rentsafe-photos', true)
on conflict (id) do nothing;

create policy "public_photo_upload" on storage.objects
  for insert to anon
  with check (bucket_id = 'rentsafe-photos');

create policy "public_photo_read" on storage.objects
  for select to anon
  using (bucket_id = 'rentsafe-photos');

create policy "public_photo_delete" on storage.objects
  for delete to anon
  using (bucket_id = 'rentsafe-photos');
