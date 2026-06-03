-- Run in Supabase SQL Editor
alter table public.assets add column if not exists room_name text;
alter table public.assets add column if not exists replacement_cost_confirmed boolean default false;
create index if not exists assets_room_name_idx on public.assets(agreement_id, room_name);
