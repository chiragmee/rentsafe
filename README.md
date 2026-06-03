# RentSafe — Deposit Protection Platform

> Help tenants create undeniable evidence at move-in so they can recover more of their security deposit at move-out.

**Live:** https://rentsafe-two.vercel.app

---

## What It Does

RentSafe converts a legally blind, emotionally charged deposit settlement into a transparent, pre-agreed, digitally documented rental transaction.

- Upload a rent agreement (PDF or DOCX) → AI extracts all key details
- Document every room and item with photos
- Get a **Deposit Protection Score** (0–100) and download a **Protection Report**
- Optionally invite the owner to co-sign — creates mutual evidence
- At move-out, the settlement becomes arithmetic, not a fight

Owner participation strengthens evidence but is never required for value creation.

---

## Tech Stack

| Layer | What |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Magic Link (email OTP, optional) |
| Storage | Supabase Storage (photos + walkthrough videos) |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- A [Google AI Studio](https://aistudio.google.com) API key (free tier)

### 1. Clone and install

```bash
git clone https://github.com/chiragmee/rentsafe.git
cd rentsafe
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_KEY=your-gemini-api-key
```

### 3. Set up the database

Run all SQL files in order in the Supabase SQL Editor:

```
supabase/schema.sql          # Base tables
supabase/grants.sql          # anon role permissions
supabase/add_room_name.sql   # room_name on assets
supabase/auth_migration.sql  # user_id + authenticated policies
supabase/v35_migration.sql   # protection scores, analytics, utility settlements, video
```

### 4. Configure Supabase Auth

In Supabase dashboard → Authentication → URL Configuration:
- **Site URL:** your deployed URL (e.g. `https://rentsafe-two.vercel.app`)
- **Redirect URLs:** `https://your-domain.com/**`

### 5. Run locally

```bash
npm run dev
```

App runs at `http://localhost:5173`

---

## Project Structure

```
src/
├── pages/           # One file per route
├── components/      # Shared UI components
├── services/        # Supabase, Gemini AI, PDF generation, analytics
├── config/          # Room templates and BHK configurations
└── contexts/        # Auth context

supabase/
├── schema.sql       # Full database schema
├── *.sql            # Migration files (run in order)
└── functions/       # Edge functions (ghost rule — written, not deployed)
```

---

## Key Features

### For Tenants
- **AI Agreement Parsing** — upload PDF/DOCX, Gemini extracts tenant, owner, rent, deposit, items automatically
- **BHK-based Room Setup** — select flat type, get standard items pre-populated per room
- **Evidence Documentation** — photo + condition per item, walkthrough video
- **Protection Score** — 0–100 score based on documentation completeness
- **Deposit Protection Report** — downloadable PDF with all evidence
- **Fair Deduction Simulator** — on landing page, no login required

### For Owners
- **Cost Entry** — enter replacement costs with AI market rate suggestions
- **Dispute Resolution** — side-by-side comparison with market range
- **Co-signing** — locks the registry so neither party can dispute the baseline

### Settlement
- Auto-calculated: deposit − last rent − depreciated damages − utility dues
- Depreciation formula with 10% salvage floor, owner-adjustable ±2%
- Utility settlement module (electricity, water, maintenance, gas)

---

## Flows

```
Landing → Upload Agreement → Review Details → BHK Setup
       → Registry Documentation → Protection Score → Protection Report
       → [Optional] Invite Owner → Owner Cost Entry → Tenant Verification → Co-Sign
       → Dashboard → Move-Out Audit → Settlement
```

---

## Analytics

Founder analytics dashboard at `/admin/analytics` (admin-only).

Tracks 15 funnel events: `agreement_uploaded` → `agreement_parsed` → `review_completed` → `bhk_setup_completed` → `registry_started` → `registry_completed` → `walkthrough_uploaded` → `protection_score_generated` → `protection_report_downloaded` → `owner_invited` → `owner_opened` → `owner_signed` → `moveout_started` → `settlement_generated` → `settlement_completed`

---

## Deployment

The project auto-deploys to Vercel on every push to `main`.

To deploy manually:
```bash
vercel --prod
```

Set environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

---

## MVP Limitations

- **OTP** — mock implementation, any 4-digit number accepted
- **PDF generation** — browser `window.print()`, not a proper PDF library
- **Ghost rule** — client-side 72hr check; edge function written but not deployed
- **Compliance** — Karnataka deposit cap only; more states planned
- **Scanned agreements** — Gemini reads text-based PDFs/DOCX only

---

## License

Private — all rights reserved.
