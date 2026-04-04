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
- **Resend** — transactional email (rental request notifications, calendar backup)
- **PDFKit** — server-side PDF generation (calendar backup)
- **Framer Motion** — animations, **Lucide React** — icons, **Marked** — Markdown rendering

## Architecture

### Routing Layout

- `src/app/(public)/` — public pages with Header/Footer layout
  - `aktuality/` — articles listing + `[slug]` detail
  - `tym/` — squad, match results, league table, player stats, season draws + `[id]` player detail
  - `plan-akci/` — upcoming events + interactive calendar with weekly schedule
  - `o-klubu/` — club history, sokolovna, board, contact, map
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

### Admin Pages

- **Plán akcí** (`/admin/events`) — 3 tabs: calendar events, weekly schedule (valid_from/valid_to date ranges), rental requests (approve/reject workflow)
- **Zápasy** (`/admin/matches`) — 3 tabs: match results (lineup, scorers, cards, images, publish-to-article), season draws, league standings
- **Hráči** (`/admin/players`) — player management with stats computed from match data, active/inactive filter tabs
- **Články** (`/admin/articles`) — article CRUD with markdown editor, image upload, editable publish date
- **Uživatelé** (`/admin/users`) — read-only list of users with roles (admin/editor)
- **Historie změn** (`/admin/audit`) — chronological audit log, filterable by entity type
- **Koš** (`/admin/trash`) — soft-deleted items with restore and permanent delete, 30-day countdown

### Admin Form UX Pattern

All admin forms follow a consistent save/cancel pattern:
- **Edit mode**: "Uložit" saves and stays in form, shows green "Uloženo" confirmation. Any field change clears the message.
- **New mode**: "Uložit" saves and closes the form (resets).
- **Zrušit**: Always exits editing and closes the form.
- Implementation: `saved` state + `updateXxxForm()` wrapper that calls `setSaved(false)` before `setForm()`.

### API Route Pattern

Each resource has `src/app/api/{resource}/route.ts` (GET list, POST create) and `src/app/api/{resource}/[id]/route.ts` (GET one, PUT update, DELETE). All mutations:
1. Validate with Zod schemas
2. Check auth via `supabase.auth.getUser()`
3. Use `createServiceClient()` for DB operations
4. Log via `logAudit()` after successful mutation

Exception: `POST /api/rental-requests` is public (no auth) with in-memory rate limiting (3 req/hour per IP).

### Audit Logging

`src/lib/audit.ts` — `logAudit(supabase, { userId, userEmail, action, entityType, entityId, entityTitle })` called from all API routes on create/update/delete/restore. Actions: `create`, `update`, `delete`, `restore`. Entity types: `article`, `match`, `calendar_event`, `player`. Failures are caught silently (never breaks the main operation).

### Soft Delete & Trash

Articles, matches, and calendar events use soft delete (`deleted_at` TIMESTAMPTZ column). Players use hard delete.
- All GET queries filter `.is("deleted_at", null)` to exclude deleted items
- DELETE handlers set `deleted_at = now()` instead of removing rows
- Trash API (`/api/trash`) aggregates all soft-deleted items across tables
- Restore sets `deleted_at = null`, permanent delete removes row + related data

### Match Form Logic

The match form uses "Domácí" and "Hosté" fields instead of a separate "Soupeř" + "Hrajeme doma" checkbox. If "Domácí" contains "Dolany" → `is_home = true`. Venue auto-fills with the home team name. **Only home matches create calendar events** (event_type "zapas"). The calendar and admin events page filter out away matches.

### Publish-to-Article Flow

`POST /api/matches/[id]/publish` converts a match into a markdown article: generates title ("Dolany - Opponent 2:1"), body with lineup/scorers/cards (both Dolany and opponent)/summary/video, syncs match images to article images, and links via `match_results.article_id`. After publishing, a share dialog offers Facebook sharing and link copying.

### Facebook Share

Published articles and matches show a share button (Share2 icon) that opens a dialog with:
- "Sdílet na Facebook" — opens Facebook sharer with article URL + pre-filled quote ending with "Celý článek na tjdolany.net"
- "Kopírovat odkaz" — copies production URL to clipboard

Articles have OG meta tags (`og:title`, `og:description`, `og:image`) for rich Facebook previews.

### Match Opponent Stats

`match_results` has `opponent_scorers` and `opponent_cards` (free text fields) for display in published articles only — not linked to player stats. Also `video_url` for YouTube embeds.

### YouTube Video Embed

`ArticleDetail.tsx` auto-detects YouTube URLs in article content and replaces them with responsive iframe embeds (`aspect-video`).

### Database Types

Manually maintained in `src/types/database.ts` (not auto-generated from Supabase CLI). Must be updated when DB schema changes.

### Key Tables

`articles`, `article_images`, `players`, `calendar_events`, `weekly_schedule`, `rental_requests`, `match_results`, `match_lineups`, `match_scorers`, `match_cards`, `match_images`, `season_draws`, `league_standings`, `photo_albums`, `photos`, `profiles`, `audit_log`

### Migrations

SQL migrations in `supabase/migrations/` (001–015). Run via Supabase CLI: `SUPABASE_ACCESS_TOKEN=... npx supabase db query --linked "SQL"`. Project is linked to ref `qntvgaruysxgivospeoi`. Schema is SQL-first, not ORM-generated.

### Image Upload

`src/app/api/upload/route.ts` accepts images (JPEG, PNG, WebP, AVIF, max 5 MB), validates MIME type, resizes via Sharp to WebP (max 1920px, quality 80), uploads to Supabase Storage bucket "photos".

### URL Redirects

Legacy routes configured in `next.config.ts`: `/fotbal` → `/tym`, `/sokolovna` → `/plan-akci`, `/budoucnost` → `/plan-akci`, `/akce` → `/plan-akci`, `/historie` → `/o-klubu`, `/o-nas` → `/o-klubu`.

## Design System

### Heading Hierarchy (consistent across all pages)

- **Nadpis 1** (page subtitle): `<p>` with red bar + uppercase small text, centered — `text-xs font-semibold text-brand-red uppercase tracking-wider` with `<span className="w-1 h-5 bg-brand-red rounded-full" />`
- **Nadpis 2** (page title H1): Large bold, centered — `text-4xl font-extrabold text-text tracking-tight`
- **Nadpis 3** (section H2): Red dash + title, centered — `text-2xl font-bold text-text tracking-tight flex items-center justify-center gap-3` with `<span className="w-8 h-0.5 bg-brand-red rounded-full" />`

### Colors & Theme

- Brand colors: `brand-red` (#C41E3A), `brand-yellow` (#F5C518), `brand-dark` (#111111 warm black, not navy)
- Dark mode is the **default** for new visitors. `data-theme="dark"` attribute on `<html>`, CSS variable overrides in `globals.css` — do NOT use Tailwind `dark:` prefix, it won't work with this setup. Light mode activates only when user explicitly toggles (saved as `localStorage.theme = 'light'`)
- Font: Inter (heading + body)

### Custom CSS & Components

- Custom CSS classes in `globals.css`: `.glass`, `.card-hover`, `.gradient-text`, `.gradient-border`, `.ticker-container`, `.ticker-ball`, `.ticker-char`, `.ticker-space`
- Shared constants in `src/lib/utils.ts`: positions, event types, locations, organizers, date formatters, `CATEGORIES`
- Stat icons in `src/components/ui/StatIcons.tsx`: `JerseyIcon`, `BallIcon`, `YellowCard`, `RedCard`

### Calendar Visual System

- **TYP** (event type): colored vertical bar before event title (`w-0.5 h-3 rounded-full`)
- **MÍSTO** (location): colored circle after event title (`w-1.5 h-1.5 rounded-full`)
- Occupied days (all-day events, matches) have red background tint
- Multi-day events appear on all days in date range

### Section Navigation Pattern

All public pages use sticky scroll-to-section navigation buttons below the header (`sticky top-16 z-30 bg-surface-muted/95 backdrop-blur-sm border-b border-border`). On Aktuality, the category filter is sticky instead. Sections use `id` attributes and `scroll-mt-28` for proper offset. Button style: `bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted`.

## Czech Locale Conventions

- Dates formatted as "15. března 2025", calendar weeks start Monday
- Slug generation strips Czech diacritics to ASCII (`slugify()` in utils)
- Football seasons: "podzim" (Aug-Dec) / "jaro" (Jan-Jul), format "2025/2026"
- Season calculation: month >= 7 (August+) → year is season start; else previous year
- Position values: `brankar`, `obrance`, `zaloznik`, `utocnik`
- Event types: `zapas`, `trenink`, `akce`, `pronajem`, `volne`
- `is_public` means "open to public attendance", NOT "visible in calendar" — all events show in calendar regardless

### Email System

`src/lib/email.ts` uses Resend to send transactional emails. Currently sends from `onboarding@resend.dev` (temporary until tjdolany.net domain is verified in Resend — then change to `noreply@tjdolany.net`). Reply-to is `tjdolany@gmail.com`. Note: public contact email on O klubu page is `tjdolany@seznam.cz` (different from admin/system email). Two email types: new rental request notification (to admin) and approval/rejection notification (to requester). Note: `onboarding@resend.dev` can only send to the Resend account owner's email.

### Rental Request Workflow

Public form on `/plan-akci` → `POST /api/rental-requests` (rate-limited, no auth) → stores in `rental_requests` table + emails admin → admin approves/rejects in `/admin/events` Žádosti tab → approved requests auto-create `calendar_events` entry (with `description` for public events) → requester gets email notification.

Two event types in form:
- **Soukromá akce** (`pronajem`): No title, no description, no "Veřejná" checkbox. Has organizer name + note ("pro administrátora"). Contact always required.
- **Ostatní** (`volne`): Has event name, organizer dropdown (ORGANIZERS + custom), optional "Veřejná" checkbox. When veřejná, shows "Popis akce" field (carries to calendar description on approval). Contact required only for custom organizer.

### Cron Jobs

`src/app/api/cron/calendar-backup/route.ts` — weekly PDF backup of calendar events. Generates a table of current month + next 4 weeks events, sends PDF via Resend to `tjdolany@gmail.com`. Triggered by Vercel Cron (Monday 8:00 UTC, configured in `vercel.json`). Requires `CRON_SECRET` env var for bearer token auth.

### Timezone Handling

All datetimes stored as UTC in TIMESTAMPTZ columns. Admin forms (client-side) use `new Date().toISOString()` to convert browser local time to UTC before sending. Server-side code (API routes) uses Europe/Prague offset detection for timezone-aware conversion. Display uses `getHours()`/`getMinutes()` which automatically converts UTC to browser local time.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `NEXT_PUBLIC_SITE_URL` — Production URL (https://tjdolany.net)
- `RESEND_API_KEY` — Resend email service API key
- `CRON_SECRET` — Bearer token for cron job authentication
- `SUPABASE_ACCESS_TOKEN` — Supabase CLI access token (for running migrations)

## Legacy Website

The original tjdolany.net site (2003–2025) is archived as a static site on GitHub Pages: `tjdolany-hub.github.io/tjdolany-legacy/` (repo: `tjdolany-hub/tjdolany-legacy`). All images converted to WebP, HTML converted from windows-1250 to UTF-8. Linked from the "Starý web" section on the O klubu page.
