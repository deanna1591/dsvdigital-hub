# DSV Digital Hub

Employee engagement portal for DSV Digital. Replaces the WordPress-based portal at portal.dsvdigital.com.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + Storage)

## Status

🚧 **Phase 1 of N** — foundation deployed, ~40% feature parity with the design mockup.

| What | Status |
|---|---|
| Next.js 15 app skeleton, TypeScript, Tailwind | ✅ Built |
| Supabase SSR auth (email/password + Google OAuth scaffold) | ✅ Built |
| Login / signup / signout flow | ✅ Built |
| Database schema for all features (6 migrations) | ✅ Built |
| Admin shell: review queues, award points, team balances | ✅ Built |
| Dashboard shell: balance, basic tabs | ✅ Built |
| Slot machine server-side RNG | ✅ Built |
| Y2K design tokens | ✅ Wired |
| Categorized nav, streak timeline, mood wheel, photobooth, etc | ❌ To port from mockup |
| Bingo Y2K card + monthly board editor | ❌ To port |
| Notification bell, weekly digest PDF, sparks scheduler | ❌ To port |
| Google Sheets sync | ⚠️ Stubbed |

See `BUILD_GUIDE.md` for the week-by-week roadmap.

## Getting it running locally

### Pre-reqs

- Node 20+
- A Supabase project (free tier)
- (Later) Google Cloud project for OAuth — email/password works for now

### Setup

```bash
# 1. Install
npm install

# 2. Set up env
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY

# 3. Push schema (Supabase CLI: brew install supabase/tap/supabase)
supabase link --project-ref <your-project-ref>
supabase db push

# 4. Run
npm run dev    # → http://localhost:3000
```

### Verify the build before pushing

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

Both should exit zero.

## Deploying to Vercel

```bash
npm i -g vercel
vercel
# Paste env vars when prompted
vercel --prod
```

For custom domain `portal.dsvdigital.com`:
1. Vercel → Settings → Domains → add the domain
2. Add the CNAME in your DNS provider
3. Update Google OAuth redirect URI to include the new domain

## Repo structure

```
app/                # Next.js routes
components/         # Shared React components
lib/                # Supabase clients, Sheets sync, types
scripts/            # One-time scripts (importer)
supabase/           # Migrations, seed, schema
styles/             # Reference design tokens
BUILD_GUIDE.md      # The porting roadmap
```

## Reference

- Design source of truth: `dsv-portal-mockup.html`
- Data source (until cutover): the team's Google Sheet
- Cost: $0/mo for first 50 users (Supabase free + Vercel hobby)
