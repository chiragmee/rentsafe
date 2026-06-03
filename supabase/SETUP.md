# Supabase Backend Setup

## Step 1 — Create Supabase Project
1. Go to https://supabase.com → New project
2. Name: `rentsafe` · Region: South Asia (Mumbai) · Free tier

## Step 2 — Run the Schema
1. Supabase dashboard → SQL Editor → New query
2. Paste the entire contents of `schema.sql`
3. Click Run — you should see "Success. No rows returned"

## Step 3 — Get Your Credentials
1. Settings → API
2. Copy: **Project URL** → `VITE_SUPABASE_URL`
3. Copy: **anon / public** key → `VITE_SUPABASE_ANON_KEY`

## Step 4 — Create .env File
In `/rentsafe/`:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ANTHROPIC_KEY=sk-ant-api03-...
```

## Step 5 — Storage Bucket (photos)
The schema.sql already creates the bucket and policies.
If you get a storage error, manually create it:
1. Storage → New bucket
2. Name: `rentsafe-photos` · Public: ON
3. Re-run the storage policy section from schema.sql

## Step 6 — Ghost Rule Edge Function (optional for MVP)
Handles the 72hr auto-lock server-side. Skip for now — the client
already checks ghost rule status on every dashboard load.

To deploy later:
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy ghost-rule
```

Then in Supabase dashboard → Database → Extensions → enable `pg_cron`
and run:
```sql
select cron.schedule(
  'ghost-rule-hourly',
  '0 * * * *',
  $$select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ghost-rule',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);
```

## Verify Everything Works
After setting up .env, restart the dev server:
```bash
npm run dev
```
Upload a PDF → you should see the parsed agreement saved to Supabase.
Check: Supabase dashboard → Table Editor → agreements → 1 row appears.
