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

## Tech Stack

- **Next.js 16** (App Router), React 19, TypeScript strict
- **Supabase** — database, auth, storage (hosted instance `qntvgaruysxgivospeoi`)
- **Tailwind CSS v4** — uses `@theme` directive in `globals.css` (not tailwind.config)
- **Zod** — server-side validation on all API routes
- **Framer Motion** — animations, **Lucide React** — icons, **Marked** — Markdown rendering

## Architecture

### Routing Layout

- `src/app/(public)/` — public pages with Header/Footer layout (aktuality, tym, plan-akci, historie, o-nas)
- `src/app/admin/` — admin panel with sidebar, protected by Supabase Auth (redirects to `/login` if unauthenticated)
- `src/app/api/` — REST endpoints; all mutations require authenticated session
- `src/app/login/` — auth page

### Client/Server Component Pattern

Server pages (`page.tsx`) fetch data from Supabase, then pass it to client components (`*Client.tsx`) that live alongside them. Example: `tym/page.tsx` → `tym/TymClient.tsx`.

### Supabase Clients

- `src/lib/supabase/server.ts` exports two factories:
  - `createClient()` — anon key, cookie-based auth (for server components and API routes reading user data)
  - `createServiceClient()` — service role key (for admin write operations that bypass RLS)
- `src/lib/supabase/client.ts` — browser client for client components

### Admin Pages (unified)

- **Plán akcí** (`/admin/events`) — merged calendar events + weekly schedule into one page with tabs
- **Zápasy** (`/admin/matches`) — merged match results + season draws; includes lineup, scorers, cards, publish-to-article flow
- **Hráči** (`/admin/players`) — player management with stats computed from match data

### API Route Pattern

Each resource has `src/app/api/{resource}/route.ts` (GET list, POST create) and `src/app/api/{resource}/[id]/route.ts` (GET one, PUT update, DELETE). All mutations validate with Zod schemas, use `createServiceClient()`, and check auth.

### Database Types

Manually maintained in `src/types/database.ts` (not auto-generated). Must be updated when DB schema changes.

### Key Tables

`articles`, `players`, `calendar_events`, `weekly_schedule`, `match_results`, `match_lineups`, `match_scorers`, `match_cards`, `season_draws`, `photo_albums`, `photos`, `profiles`

### Migrations

SQL migrations live in `supabase/migrations/`. Run them via Supabase Dashboard SQL Editor or `supabase db push` (requires `supabase link` first).

## Design System

- Brand colors: `brand-red` (#C41E3A), `brand-yellow` (#F5C518), `brand-dark` (#0F172A)
- Dark mode: `data-theme="dark"` attribute on `<html>`, CSS variable overrides in `globals.css`
- Font: Inter (heading + body)
- Shared constants in `src/lib/utils.ts`: positions, event types, locations, organizers, formatters

## Czech Locale Conventions

- Dates formatted as "15. března 2025", calendar weeks start Monday
- Slug generation strips Czech diacritics to ASCII (`slugify()` in utils)
- Football seasons: "podzim" (Aug-Dec) / "jaro" (Jan-Jul), format "2025/2026"
- Position values: `brankar`, `obrance`, `zaloznik`, `utocnik`
- Event types: `zapas`, `trenink`, `akce`, `pronajem`, `volne`
- Locations: `cely_areal`, `sokolovna`, `kantyna`, `venkovni_cast`, `hriste`

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, never expose to client)
