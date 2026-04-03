# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Website for **TJ Dolany** football club (Dolany u Jaroměře, Czech Republic). All UI text is in **Czech**. The site has a public-facing part and an admin panel for 2-3 content managers. Production domain: tjdolany.net. Deployed via Git → GitHub → Vercel (auto-deploy).

## Commands

```bash
npm run dev          # Next.js dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type-check without emitting
```

No test framework is configured.

## Tech Stack

- **Next.js 16** (App Router), React 19, TypeScript strict
- **Supabase** — database (PostgreSQL), auth, storage (hosted instance `qntvgaruysxgivospeoi`)
- **Tailwind CSS v4** — uses `@theme` directive in `globals.css` (not tailwind.config)
- **Zod** — server-side validation on all API routes
- **Sharp** — server-side image optimization (WebP, resize)
- **Resend** — transactional email (rental request notifications)
- **Framer Motion** — animations, **Lucide React** — icons, **Marked** — Markdown rendering

## Architecture

### Routing Layout

- `src/app/(public)/` — public pages with Header/Footer layout
  - `aktuality/` — articles listing + `[slug]` detail
  - `tym/` — squad, match results, league table, player stats, season draws + `[id]` player detail
  - `plan-akci/` — upcoming events + interactive calendar with weekly schedule
  - `o-klubu/` — club history, sokolovna, board, contact, map (merged from historie + o-nas)
  - `galerie/` — photo galleries (planned)
- `src/app/admin/` — admin panel with sidebar, protected by Supabase Auth + middleware redirect to `/login`
- `src/app/api/` — REST endpoints; all mutations require authenticated session
- `src/app/login/` — auth page

### Client/Server Component Pattern

Server pages (`page.tsx`) fetch data from Supabase, then pass serializable data to client components (`*Client.tsx`) that live alongside them. Example: `tym/page.tsx` → `tym/TymClient.tsx`. Public pages use `revalidate = 60` for ISR.

### Supabase Clients

`src/lib/supabase/server.ts` exports two factories:
- `createClient()` — anon key, cookie-based auth (server components & API routes)
- `createServiceClient()` — service role key (admin writes that bypass RLS)

`src/lib/supabase/client.ts` — browser client for client components.

### Middleware

`src/middleware.ts` refreshes Supabase auth session on every request and redirects unauthenticated users away from `/admin/*` to `/login`.

### Admin Pages (unified)

- **Plán akcí** (`/admin/events`) — calendar events + weekly schedule + rental requests (3 tabs); schedule has valid_from/valid_to date ranges; requests tab shows pending/approved/rejected with approve/reject workflow
- **Zápasy** (`/admin/matches`) — match results + season draws + league standings; includes lineup (ZS/N), scorers (1 row = 1 goal), cards, photo gallery, publish-to-article flow
- **Hráči** (`/admin/players`) — player management with stats computed from match data
- **Články** (`/admin/articles`) — article CRUD with markdown editor, image upload, editable publish date

### API Route Pattern

Each resource has `src/app/api/{resource}/route.ts` (GET list, POST create) and `src/app/api/{resource}/[id]/route.ts` (GET one, PUT update, DELETE). All mutations validate with Zod schemas, use `createServiceClient()`, and check auth via `supabase.auth.getUser()`. Exception: `POST /api/rental-requests` is public (no auth) with rate limiting.

### Database Types

Manually maintained in `src/types/database.ts` (not auto-generated from Supabase CLI). Must be updated when DB schema changes.

### Key Tables

`articles`, `article_images`, `players`, `calendar_events`, `weekly_schedule`, `rental_requests`, `match_results`, `match_lineups`, `match_scorers`, `match_cards`, `match_images`, `season_draws`, `league_standings`, `photo_albums`, `photos`, `future_events`, `profiles`

### Migrations

SQL migrations in `supabase/migrations/` (001–011). Run via Supabase Dashboard SQL Editor. Schema is SQL-first, not ORM-generated.

### Image Upload

`src/app/api/upload/route.ts` accepts images, validates MIME type, resizes via Sharp to WebP (max 1920px, quality 80), uploads to Supabase Storage.

### URL Redirects

Legacy routes configured in `next.config.ts`: `/fotbal` → `/tym`, `/sokolovna` → `/plan-akci`, `/budoucnost` → `/plan-akci`, `/akce` → `/plan-akci`, `/historie` → `/o-klubu`, `/o-nas` → `/o-klubu`.

## Design System

### Heading Hierarchy (consistent across all pages)

- **Nadpis 1** (page subtitle): `<p>` with red bar + uppercase small text, centered — `text-xs font-semibold text-brand-red uppercase tracking-wider` with `<span className="w-1 h-5 bg-brand-red rounded-full" />`
- **Nadpis 2** (page title H1): Large bold, centered — `text-4xl font-extrabold text-text tracking-tight`
- **Nadpis 3** (section H2): Red dash + title, centered — `text-2xl font-bold text-text tracking-tight flex items-center justify-center gap-3` with `<span className="w-8 h-0.5 bg-brand-red rounded-full" />`

### Colors & Theme

- Brand colors: `brand-red` (#C41E3A), `brand-yellow` (#F5C518), `brand-dark` (#111111 warm black, not navy)
- Dark mode: `data-theme="dark"` attribute on `<html>`, CSS variable overrides in `globals.css` — do NOT use Tailwind `dark:` prefix, it won't work with this setup
- Font: Inter (heading + body)

### Custom CSS & Components

- Custom CSS classes in `globals.css`: `.glass`, `.card-hover`, `.gradient-text`, `.gradient-border`, `.ticker-container`, `.ticker-ball`, `.ticker-char`, `.ticker-space`
- Shared constants in `src/lib/utils.ts`: positions, event types, locations, organizers, date formatters, `CATEGORIES`
- Stat icons in `src/components/ui/StatIcons.tsx`: `JerseyIcon`, `BallIcon`, `YellowCard`, `RedCard`

### Section Navigation Pattern

Long pages (Tým, O klubu) use scroll-to-section navigation buttons. On Tým page, the nav is sticky below the header (`sticky top-16 z-30`). Sections use `id` attributes and `scroll-mt-28` for proper offset.

## Czech Locale Conventions

- Dates formatted as "15. března 2025", calendar weeks start Monday
- Slug generation strips Czech diacritics to ASCII (`slugify()` in utils)
- Football seasons: "podzim" (Aug-Dec) / "jaro" (Jan-Jul), format "2025/2026"
- Season calculation: month >= 7 (August+) → year is season start; else previous year
- Position values: `brankar`, `obrance`, `zaloznik`, `utocnik`
- Event types: `zapas`, `trenink`, `akce`, `pronajem`, `volne`

### Email System

`src/lib/email.ts` uses Resend to send transactional emails. Currently sends from `onboarding@resend.dev` (temporary until tjdolany.net domain is verified in Resend). Reply-to is `tjdolany@gmail.com`. Two email types: new rental request notification (to admin) and approval/rejection notification (to requester).

### Rental Request Workflow

Public form on `/plan-akci` → `POST /api/rental-requests` (rate-limited, no auth) → stores in `rental_requests` table + emails admin → admin approves/rejects in `/admin/events` Žádosti tab → approved requests auto-create `calendar_events` entry → requester gets email notification.

### Timezone Handling

All datetimes stored as UTC in TIMESTAMPTZ columns. Admin forms (client-side) use `new Date().toISOString()` to convert browser local time to UTC before sending. Server-side code (API routes) uses Europe/Prague offset detection for timezone-aware conversion. Display uses `getHours()`/`getMinutes()` which automatically converts UTC to browser local time.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `NEXT_PUBLIC_SITE_URL` — Production URL (https://tjdolany.net)
- `RESEND_API_KEY` — Resend email service API key
