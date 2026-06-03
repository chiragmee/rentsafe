-- Run in Supabase SQL Editor

-- 1. Add user_id to agreements
alter table public.agreements
  add column if not exists user_id uuid references auth.users(id);

create index if not exists agreements_user_id_idx on public.agreements(user_id);

-- 2. Grant authenticated role same permissions as anon
grant usage on schema public to authenticated;
grant all on public.agreements      to authenticated;
grant all on public.assets          to authenticated;
grant all on public.room_conditions to authenticated;
grant all on public.signatures      to authenticated;
grant all on public.settlements     to authenticated;

-- 3. RLS policies for authenticated role
create policy "auth_agreements" on public.agreements
  for all to authenticated using (true) with check (true);

create policy "auth_assets" on public.assets
  for all to authenticated using (true) with check (true);

create policy "auth_room_conditions" on public.room_conditions
  for all to authenticated using (true) with check (true);

create policy "auth_signatures" on public.signatures
  for all to authenticated using (true) with check (true);

create policy "auth_settlements" on public.settlements
  for all to authenticated using (true) with check (true);

-- Storage: allow authenticated users
create policy "auth_photo_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rentsafe-photos');

create policy "auth_photo_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'rentsafe-photos');
