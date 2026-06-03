-- Run this in Supabase SQL Editor after schema.sql
-- Grants anon role full access to all RentSafe tables

grant usage on schema public to anon;

grant all on public.agreements      to anon;
grant all on public.assets          to anon;
grant all on public.room_conditions to anon;
grant all on public.signatures      to anon;
grant all on public.settlements     to anon;
