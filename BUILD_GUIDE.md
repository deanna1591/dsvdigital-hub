# DSV Portal — Build Guide

Real talk: the mockup looks complete, but the production code that backs it is roughly **40% built**. You have a solid foundation (auth, schema, admin shells, slot machine RNG) but most of the visual polish and admin features added during mockup iteration need to be ported.

This guide is honest about what's done vs what you'll write.

---

## What's in this codebase

| Status | Feature |
|---|---|
| ✅ Built | Next.js 15 app skeleton, Supabase SSR auth, middleware gate |
| ✅ Built | Schema for points, missions, catalog, redemptions (migrations 001-003) |
| ✅ Built | Schema for daily sparks, bingo events, slot machine (004-005) |
| ✅ Built | Schema for everything mockup-era: bingo boards, sparks schedule, digest PDFs, notifications, mood/habits/tasks, photo strips, activity engine, challenges, workspace settings (006 — added in this session) |
| ✅ Built | Admin shell with AwardPointsForm, TeamBalances, PendingTable |
| ✅ Built | Login page (Google OAuth pattern, needs config to actually work) |
| ⚠️ Half-built | Today tab (only basic spark claim; no streak timeline, no mood wheel, no weekly digest banner) |
| ⚠️ Half-built | Admin (missing: bingo board editor, sparks schedule, digest upload, activity engine, challenges, workspace settings UI) |
| ❌ Not built | Slots panel UI (server RNG works; needs activity ledger panel) |
| ❌ Not built | Photobooth with Canvas + gallery + Storage upload |
| ❌ Not built | Spin wheel (200 things) |
| ❌ Not built | Music tab |
| ❌ Not built | Habits/Tasks UIs |
| ❌ Not built | Bingo Y2K card view + line detection wiring |
| ❌ Not built | Notification bell + panel |
| ❌ Not built | Y2K design system (colors, fonts, chunky shadows) |
| ❌ Not built | Google Sheets sync (service account + write-back) |

---

## Tonight: deploy something live (~2 hours)

### 1. Install the toolchain (~15 min)

You're on Mac or Linux? These commands work as-is. On Windows? Use WSL2 first.

```bash
# Node 20+ via nvm (skip if you have Node 20)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc  # or ~/.bashrc
nvm install 20
nvm use 20

# pnpm (faster than npm)
corepack enable
corepack prepare pnpm@latest --activate

# GitHub CLI for repo creation
brew install gh           # mac
# or: sudo apt install gh # linux

# Supabase CLI
brew install supabase/tap/supabase
# or: npm i -g supabase

# Vercel CLI
pnpm i -g vercel

# Verify
node --version    # >= v20
pnpm --version    # >= 9
supabase --version
vercel --version
gh --version
```

### 2. Create the accounts you need (~15 min)

- **GitHub** — for code hosting. Already have one? Skip.
- **Supabase** → https://supabase.com/dashboard/sign-up — sign in with GitHub
- **Vercel** → https://vercel.com/signup — sign in with GitHub
- **Google Cloud Console** → https://console.cloud.google.com — needed for OAuth

### 3. Create the Supabase project (~10 min)

In the Supabase dashboard:

1. **New project**
2. Name: `dsv-portal`
3. Region: **Southeast Asia (Singapore)** — closest to PH
4. Password: generate a strong one, save it
5. Wait ~2 minutes for provisioning

Once ready, grab these from **Project Settings → API**:
- `Project URL` → save as `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → save as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` key → save as `SUPABASE_SERVICE_ROLE_KEY` *(treat this like a password — never commit)*

### 4. Run the migrations (~10 min)

From this codebase root (after you've cloned the repo I'll give you below):

```bash
# Initialize Supabase locally
supabase init    # creates supabase/config.toml

# Link to your remote project
supabase link --project-ref <your-project-ref>
# (project-ref is in your Supabase URL: https://<ref>.supabase.co)

# Push all 6 migrations
supabase db push
```

Verify in the Supabase dashboard → **Table Editor**. You should see ~25 tables.

### 5. Set up Google OAuth (~20 min)

In Google Cloud Console:

1. **Create new project** "DSV Portal"
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Authorized redirect URIs:
   - `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
5. Save **Client ID** and **Client Secret**

In Supabase dashboard:

1. **Authentication → Providers → Google → Enable**
2. Paste the Client ID + Secret
3. Save

**Critical for domain restriction:** when you call `signInWithOAuth`, pass `hd: 'dsvdigital.com'` in `queryParams`. Already wired in `/app/login/actions.ts`.

### 6. Create env vars file (~5 min)

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# After Vercel deploy, set this to your real URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# For Google Sheets sync (later)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_KEY=
GOOGLE_SHEET_ID=1Osf9xFYGlPJ0nyTzzK567oy3VjD1mrDcdxjthREt0Mo
```

### 7. Run locally (~5 min)

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. You should see the login screen. Click "Sign in with Google" → land on dashboard.

### 8. Deploy to Vercel (~15 min)

```bash
# Init git if you haven't
git init
git add .
git commit -m "Initial DSV Portal"

# Create GitHub repo (private)
gh repo create dsv-portal --private --source=. --push

# Deploy
vercel
# - Set up new project? Yes
# - Link to existing? No
# - Use default settings? Yes
# - Add env vars when prompted (paste from .env.local)

# Production deploy
vercel --prod
```

You get a URL like `dsv-portal-abc123.vercel.app`. That's live.

### 9. Custom domain (optional, ~10 min)

In Vercel project settings:
- **Domains** → Add `portal.dsvdigital.com`
- Add the CNAME record in your DNS provider
- SSL auto-provisions

Update Google OAuth redirect URI to include the custom domain too.

**Add `NEXT_PUBLIC_SITE_URL=https://portal.dsvdigital.com` to Vercel env vars and redeploy.**

✅ **You now have an empty portal at portal.dsvdigital.com.** Anyone with an @dsvdigital.com Google account can sign in. They'll see the basic dashboard.

---

## This weekend: data + working employee view (~10 hours)

### Phase A: Import your 49 teammates from the Google Sheet (~2h)

The script is at `scripts/import-from-sheet.ts`. You'll need:

1. **Service account** for Google Sheets API:
   - Google Cloud Console → IAM & Admin → Service Accounts → Create
   - Name: "DSV Portal Sheets Sync"
   - Create JSON key → download → save as `service-account.json` (gitignored!)
   - Open your Google Sheet → Share → add the service account's email with Editor access

2. **Run the import:**
   ```bash
   pnpm tsx scripts/import-from-sheet.ts
   ```

This creates 49 `profiles` rows + a balance starting from the 2025 carryover values.

### Phase B: Y2K design tokens (~2h)

Open `/home/claude/dsv-portal-mockup.html` in a code editor. Copy the `:root` CSS variables block (lavender, goldrush, bubblegum, cotton, frost, ivory, bronze, graphite) into `app/globals.css`.

Set up Tailwind to use them via `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      lavender:  'rgb(var(--lavender) / <alpha-value>)',
      goldrush:  'rgb(var(--goldrush) / <alpha-value>)',
      bubblegum: 'rgb(var(--bubblegum) / <alpha-value>)',
      cotton:    'rgb(var(--cotton) / <alpha-value>)',
      // ...
    },
    fontFamily: {
      serif: ['Fraunces', 'serif'],
      sans:  ['DM Sans', 'system-ui', 'sans-serif'],
    },
  },
},
```

Load fonts in `app/layout.tsx`:

```tsx
import { Fraunces, DM_Sans } from 'next/font/google'
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
```

### Phase C: Today tab + streak timeline (~3h)

The hard work is in `components/streak-timeline.tsx`. Copy the rendering logic from the mockup's JS (look for `renderTimeline` and `renderTimelineDay`). Convert to React:

```tsx
// components/streak-timeline.tsx
type DayEntry = {
  date: string                              // 'YYYY-MM-DD'
  state: 'today' | 'streak' | 'done' | 'pending' | 'miss'
  items: Array<{
    icon: string
    title: string
    subtitle?: string
    points?: number
    time?: string
    status?: 'approved' | 'pending'
    cta?: string
    ctaHref?: string
    noPoints?: boolean
  }>
}

export function StreakTimeline({ days }: { days: DayEntry[] }) {
  // ... render the same JSX patterns from the mockup
}
```

Server data fetch in `app/(app)/today/page.tsx`:

```tsx
// Pull last 14 days of activity for the current user
const supabase = createServerClient(...)
const { data: sparks } = await supabase
  .from('daily_spark_claims')
  .select('*, daily_sparks(*)')
  .eq('employee_id', user.id)
  .gte('created_at', fourteenDaysAgo)
// + bingo claims, mission submissions, slot wins, mood checkins
// Group by date → DayEntry[]
return <StreakTimeline days={byDate} />
```

### Phase D: Categorized nav (~1h)

Copy `CATEGORIES` object from the mockup. Create `components/nav.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const CATEGORIES = {
  today: { label: '✨ Today', tabs: [{ id: 'today', href: '/today' }] },
  fun:   { label: '💿 Fun Stuff', tabs: [
    { id: 'slots', href: '/slots', label: '💿 Slots' },
    { id: 'wheel', href: '/wheel', label: '🪩 Spin Wheel' },
    { id: 'photobooth', href: '/photobooth', label: '📸 Photobooth' },
    { id: 'music', href: '/music', label: '📼 Music' },
  ]},
  // ...
}
```

Use Next.js routes instead of tab panels — each tab becomes its own page.

### Phase E: First deploy of Today (~1h)

```bash
git add .
git commit -m "Today tab + streak timeline"
git push    # auto-deploys to Vercel
```

Open your URL, log in, see your real streak. Big moment.

---

## Subsequent weekends — porting features

For each mockup feature, follow this pattern:

1. **Read the mockup HTML/JS** for that feature (sections are clearly commented in the 6,800-line file)
2. **Extract the JS state model** — what data drives it?
3. **Make that a Supabase query** (probably already a table from migration 006)
4. **Build a React component** for the UI, copying the JSX shape and CSS classes
5. **Wire mutations via Server Actions** (`'use server'` functions that write to Supabase)
6. **Push, test, ship**

### Recommended weekly order

| Week | Features | Mockup lines to reference |
|---|---|---|
| 2 | Notifications bell + panel | search "EMPLOYEE_NOTIFICATIONS" in mockup |
| 2 | Weekly digest banner + PDF reader | search "digest-banner", "digest-pdf-frame" |
| 3 | Slots panel + activity ledger | "computeSpinStats", "activityLedger" |
| 3 | Bingo card (Y2K version) | "BINGO_DATA", "renderBingo", "celebrateBingo" |
| 4 | Photobooth + Canvas strips | "renderStripCanvas", "stripGallery" |
| 4 | Spin wheel (200 things) | "ACTIVITIES_200" + wheel SVG |
| 4 | Music cassette tab | "panel-music" section |
| 5 | Habits, Tasks, Mood widgets | "panel-habits", "panel-tasks", "mood-card" |
| 5 | Admin: Award Points (already half-built) + Activity Engine + Challenges | existing /app/admin |
| 6 | Admin: Sparks Schedule + Bingo Boards editor + Digest upload | "openBingoBoardEditor", "openSparkScheduleModal" |
| 7 | Google Sheets sync via service account | see `lib/sheets/sync.ts` skeleton |
| 8 | QA + soft launch to 5 trusted ICs |

---

## Google Sheets sync architecture

The portal becomes the source of truth. The sheet becomes a mirror.

**Write path** (portal → sheet):
- Every `point_activities` insert fires a database webhook → Edge Function → Google Sheets API → updates the matching cell in the monthly tab

**Read path** (sheet → portal) — for manual admin edits:
- Nightly Vercel cron job calls `lib/sheets/sync.ts` → reads sheet → diffs against DB → applies new values

I've stubbed `lib/sheets/sync.ts` with the function signatures. You fill in the bodies.

**Required env vars:**
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_KEY` (the full JSON, base64-encoded for env safety)
- `GOOGLE_SHEET_ID=1Osf9xFYGlPJ0nyTzzK567oy3VjD1mrDcdxjthREt0Mo`

The service account needs Editor access on the sheet (share from Google Sheets UI).

---

## Storage buckets

Run these once via the Supabase dashboard (or `supabase/seed.sql`):

```sql
insert into storage.buckets (id, name, public) values
  ('digests',      'digests',      true),   -- weekly digest PDFs (public so iframe embed works)
  ('strips',       'strips',       false),  -- photobooth strips (private, signed URLs)
  ('bingo_claims', 'bingo_claims', false),  -- bingo proof photos (private)
  ('avatars',      'avatars',      true);   -- profile photos
```

Then add bucket policies (sample for `strips`):

```sql
create policy "users upload their own strips" on storage.objects
  for insert with check (
    bucket_id = 'strips' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users read their own strips" on storage.objects
  for select using (
    bucket_id = 'strips' and auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Cost (~$0/mo for 50 users)

- Supabase free tier: 500MB DB, 1GB Storage, 50K MAU → fits easily
- Vercel hobby tier: 100GB bandwidth, unlimited serverless → fits easily
- Google Workspace OAuth: included in your existing Workspace plan
- Domain: you already own dsvdigital.com

**Watch out**: if a teammate uploads a 50MB photobooth strip and 49 others view it, that's 2.5GB bandwidth. Keep an eye on Vercel's bandwidth meter. If you cross 100GB, the upgrade is $20/mo on Pro tier.

---

## Help & stuck moments

When you hit a wall:

1. **Reference the mockup file** — it has the visual + logic for every feature
2. **Reference this codebase** — patterns for auth, server actions, and Supabase queries
3. **Come back here** — paste the error or the specific feature you're working on, I'll write the React code

You don't need to rebuild this alone. The mockup is your design spec, the migrations are your data model, and the original Next.js code is your auth + admin scaffold. The work between them is structured.

Good luck. Ship it.
