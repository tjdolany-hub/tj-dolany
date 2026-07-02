# Audit webu TJ Dolany (tj-dolany-v2)

**Datum:** 1. 7. 2026 · **Rozsah:** 110 souborů / ~18 300 řádků, 25 migrací · **Metoda:** 6 paralelních agentů (bezpečnost, korektnost, výkon, přístupnost, SEO, závislosti/config, kvalita kódu), každý nález ověřený čtením reálného kódu.

Skóre po oblastech (počty ověřených nálezů):

| Oblast | Critical | High | Medium | Low/Info |
|---|---|---|---|---|
| 🔒 Bezpečnost | 0 | 1 | 1 | 9 |
| 🐞 Korektnost & data | 0 | 3 | 4 | 3 |
| ⚡ Výkon | 0 | 3 | 3 | 3 |
| ♿ Přístupnost | 0 | 1 | 6 | 8 |
| 🔍 SEO | 0 | 1 | 2 | 4 |
| 📦 Závislosti & config | 0 | 3 | 2 | 3 |
| 🧹 Kvalita kódu | — | — | — | (viz níže) |

**Celkový verdikt:** Aplikační vrstva je solidní (auth přes `getUser()`, Zod validace, DOMPurify, žádné secrets v klientu, `.env` v gitignore). Nejzávažnější rizika jsou **na hranici DB (RLS)** a v **jedné datové netěsnosti** (smazané články veřejně čitelné) plus **zastaralý Next.js s CVE bypassem middleware**. Žádný nález není „Critical", ale několik „High" má reálný dopad na produkci.

---

## ✅ Stav nápravy (větev `fix/audit-remediation`)

Odškrtnuté oblasti byly opraveny, ověřeny (`tsc` čistý, `lint` 0 chyb, `build` prošel) a otestovány proti reálnému produkčnímu buildu (homepage, o-klubu + Google Maps, sitemap, robots — bez chyb a bez CSP porušení).

- [x] **P0** soft-delete leak, hranice sezóny `>=7`, cron guard, Next.js 16.2.9 + `npm audit fix` (11→2 build-time), RLS trigger proti eskalaci role (migrace 026)
- [x] **P1** přepočet obou sezón při editaci + await, timezone-safe sezóny, sitemap/robots, security headers (CSP+HSTS+…), oprava ESLintu, open-redirect, SSRF guard, escapování e-mailů, `.max()` meze, auth na trénincích
- [x] **P2** výkon (logo sizes, sezónní filtr tabulky, Map lookup, `cache()` na hráči), přístupnost (skip-link, kontrast, klávesová obsluha, dialog role, aria-labely, H1 zápasů), úklid (mrtvý kód, osiřelé stránky, `/api/events`, teams revalidate, audit.ts), `middleware`→`proxy`

**Původně odložené refaktory — ✅ DOKONČENO 2026-07-02 (PR #3, mergnuto do `main`):** paginace `/aktuality` (server fetchuje jen cover, klient renderuje po 24 + „Načíst další"), přesun `marked`+`dompurify` na server (`lib/article-html.ts`, `contentHtml` prop — mizí z klientského bundlu), rozpad god-componentů (`admin/matches` → `DrawsTab`+`StandingsTab`; `admin/events` → `ScheduleTab`; requests už byl `RentalRequestsTab`), asociace `<label>`/`htmlFor` ve veřejném formuláři žádosti, reálné `<td>` buňky + `<tr colSpan=6>` detail v tabulce výsledků (klikací řádek + klávesnicově dostupné tlačítko). Ověřeno buildem + veřejné části v prohlížeči; admin rozpady jen buildem (login) → chce smoke-test. Zbývá už jen rozpad dvou velkých formulářů (match-form, event-form) — nízká priorita. Navíc opraveno: **dev-only CSP `unsafe-eval`** (jinak se `npm run dev` interaktivita rozbila) + tři dev image warningy (logo aspect ratio, LCP `priority` na above-fold, `data-scroll-behavior` na `<html>`).

**Stav nasazení:** PR #1 + PR #3 **mergnuté do `main`** → Vercel produkční deploy (ověřeno živě: Status Ready, 0 % errors, interaktivita na veřejných stránkách OK). Migrace **026** (role trigger), **027** (RLS lockdown zápisů na `service_role` + `deleted_at` ve veřejných SELECT) i **028** (`app_settings` / aktuální sezóna) **✅ aplikované** na produkční Supabase a ověřené (027 přes CLI `npx supabase db query --linked -f 027…`, potvrzeno v `pg_policies`). Zbývá jen admin smoke-test (login) — kdyby po 027 něco v adminu nešlo uložit, znamená to write path na anon klientovi místo service (rollback: re-run politik z migrace 001).

**Nová sezóna:** přidán admin přepínač „Aktuální sezóna" na `/admin` (řídí, co ukazuje hlavní stránka + Tým). Po nasazení: `/admin` → Aktuální sezóna → `2026/2027`.

---

## 🎯 Akční plán podle priority

### P0 — udělat hned (bezpečnost + únik dat + rozbité hlídání)

1. **RLS: editor se může sám povýšit na admina** — `supabase/migrations/024_user_management.sql:22-27`. UPDATE politika na `profiles` neomezuje sloupec `role`; editor s anon klíčem a vlastním tokenem zavolá `PATCH /rest/v1/profiles?id=eq.<own-id>` `{"role":"admin"}` a povýší se. **Oprava:** `REVOKE UPDATE (role) ON public.profiles FROM authenticated;` nebo trigger blokující změnu `role` mimo service_role.
2. **Smazané články jsou veřejně čitelné přes URL** — `src/app/(public)/aktuality/[slug]/page.tsx:24-29`. Query filtruje jen `published=true`, chybí `.is("deleted_at", null)`; DELETE nastavuje jen `deleted_at`, ne `published=false`. Článek v Koši jde dál otevřít/sdílet 30 dní. **Oprava:** přidat `.is("deleted_at", null)`. (1 řádek)
3. **Next.js 16.2.1 → 16.2.9** — CVE včetně *Middleware/Proxy bypass* (CVSS 8.1), který obchází právě hlídání `/admin/*`, + SSRF. `npm audit fix` + bump `next` a `eslint-config-next` na 16.2.9 vyřeší všech 11 zranitelností bez breaking changes. Poté `npm run build`.
4. **Chybná hranice sezóny `>= 6` → `>= 7`** (červenec) — `src/app/admin/matches/page.tsx:580` a `src/app/admin/treninky/page.tsx:163`. Červencové zápasy/tréninky se uloží do špatné sezóny (2026/2027 místo 2025/2026) a zmizí ze správné sezóny i ze statistik. **Oprava:** `>= 6` → `>= 7`. (2 řádky)
5. **`CRON_SECRET` bypass přes `Bearer undefined`** — `src/app/api/cron/calendar-backup/route.ts:197`. Když env chybí, projde `Authorization: Bearer undefined`. **Oprava:** `const secret = process.env.CRON_SECRET; if (!secret || authHeader !== \`Bearer ${secret}\`) return 401;`

### P1 — brzy (integrita dat, hardening, SEO základ)

6. **Editace zápasu nepřepočítá starou sezónu** → zastaralé/dvojité statistiky — `src/app/api/matches/[id]/route.ts:297-300`. Při změně sezóny/data přes hranici se přepočítá jen nová. **Oprava:** načíst původní sezónu a přepočítat obě.
7. **Ztráta gólů při editaci legacy vícególového střelce** — `src/app/admin/matches/page.tsx:452-457`. Submit natvrdo `goals: 1`, počet N se v UI needituje a přepíše. **Oprava:** `goals: s.goals` (nebo expandovat na N řádků při načtení).
8. **`recomputeSeasonStats` je fire-and-forget** — `matches/route.ts:217`, `matches/[id]/route.ts:299,325`. Neawaitováno → na serverless se může přepočet ztratit, chyby se polykají. **Oprava:** `await` + log.
9. **Timezone bucketing přes bare `getMonth()`** — `src/lib/stats.ts:21,104`, `tym/MatchResultsSection.tsx:29,34`, aj. Server (UTC) vs klient (Praha) můžou zařadit půlnoční zápas na přelomu do jiné sezóny/části. **Oprava:** použít `getMonthPrague`/`getYearPrague`.
10. **Sitemap + robots chybí** — přidat `src/app/sitemap.ts` (statické trasy + články + hráči) a `src/app/robots.ts` (allow public, disallow `/admin`,`/api`,`/login`).
11. **Security headers chybí** — `next.config.ts` nemá `headers()`. Přidat CSP (musí povolit `frame-src https://www.youtube.com`), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
12. **Rozbitý linter** — `npm run lint` padá (eslint 9 / eslint-config-next 16 vs `FlatCompat`), takže nelintuje nic. Opravit config, aby CI/lokál reálně kontroloval.
13. **Nepropojené `<label>` ve formulářích** — veřejný `plan-akci/RentalRequestForm.tsx` + admin formuláře. Chybí `htmlFor`/`id`; čtečka neoznámí název pole. **Oprava:** doplnit `id`+`htmlFor` (priorita veřejný formulář).
14. **Docházka na tréninky je veřejně čitelná** — `api/trainings/route.ts` a `trainings/stats/route.ts` bez auth + RLS `USING (true)` (`020_training_attendance.sql:33-34`). **Oprava:** gate `getSession()` + SELECT policy `authenticated`.
15. **Open redirect v auth callbacku** — `api/auth/callback/route.ts:7,13`. `next` bez validace. **Oprava:** povolit jen `next` začínající `/` a ne `//`.

### P2 — plánovaně (výkon, přístupnost, úklid)

Výkon: pagination `/aktuality`, over-fetch na Tým stránce, přesun `marked`+`dompurify` na server, `sizes` na logu, sezónní filtr u homepage tabulky, waterfall na detailu hráče. Přístupnost: klávesová obsluha řádků zápasů, sémantika tabulky výsledků, lightbox jako dialog, aria-label ikon tlačítek, skip-link, kontrast patičky. SEO: H1 na zápasových článcích, výchozí OG obrázek. Údržba: `middleware`→`proxy` (Next 16), deduplikace `getSeasonForDate` (5 kopií), mrtvý kód, smazání osiřelých `/historie` a `/o-nas`, sjednocení auth přes `getSession()`/`requireAdmin()`.

---

## 🔒 Bezpečnost

**Posture:** Silná aplikační vrstva. Každá mutace autentizuje přes JWT-ověřující `getUser()` (ne spoofovatelný `getSession()` pro citlivé), tři admin-only plochy (`/api/users/*`, `rental-requests` PUT/DELETE, `trash` permanent-delete) korektně přes `requireAdmin()`, DOMPurify sanitizuje HTML, žádné secrets v `"use client"`, `.env` v gitignore, žádný veřejný signup, cron má bearer. Hlavní slabina je **RLS**.

- **[High] Editor → admin self-escalation** — `024_user_management.sql:22-27`. UPDATE policy omezuje řádek, ne sloupec `role`. Přímé PostgREST volání s anon klíčem povýší editora. Rated High (ne Critical), protože vyžaduje již přihlášený editor účet (2–3 správci, žádný veřejný signup). *Fix: REVOKE UPDATE (role) nebo trigger.*
- **[Medium] Blanket `authenticated FOR ALL` RLS** — `001_initial_schema.sql:186-211` a další (`002:48`,`005:18`,`006:23`,`016:52`,`021:18`,`023:29`). Editor může přes PostgREST **hard-DELETE** obsah (obchází soft-delete/Koš + „permanent delete = jen admin") a mutovat **bez audit logu**. Je to vědomý trade-off (CLAUDE.md), ale umožňuje i High výše. *Fix: destruktivní politiky omezit na `service_role`.*
- **[Low] SSRF v exportu kroniky** — `api/kronika/route.ts:267` `fetch(img.url)`; `images[].url` je jen `z.string()` (bez `.url()`/allow-listu) v `articles/route.ts:17` aj. Editor uloží interní URL (`169.254.169.254`) → server ji stáhne do DOCX. *Fix: omezit host na Supabase storage.*
- **[Low] Docházka na tréninky veřejně čitelná** — `api/trainings/route.ts:8-28`, `trainings/stats/route.ts` (bez auth) + RLS `USING(true)`. *Fix: auth + policy.*
- **[Low] Open redirect** — `api/auth/callback/route.ts:7,13` (`${origin}${next}` bez validace; `next=.evil.com`). Omezená exploitovatelnost (jen po úspěšném `exchangeCodeForSession`). *Fix: validovat `next`.*
- **[Low] HTML injection do notifikačního e-mailu** — `src/lib/email.ts:59-74` interpoluje neescapovaná pole z veřejného `rental-requests` POST. Bez JS, ale phishing/tracking markup do inboxu adminu. *Fix: HTML-escape.*
- **[Low] In-memory rate limiting** — `rental-requests/route.ts:8-21` (3/hod), `auth/request-reset/route.ts:7-20` (5/hod). Per-instance `Map`, resetuje se na cold startu → obejitelné, umožňuje spam / e-mail bombing resetů. *Fix: Upstash/Vercel KV nebo WAF.*
- **[Low] Chybí `.max()` na authed vstupech** — `articles/route.ts:10-12` aj. Multi-MB payloady (storage bloat). *Fix: rozumné `.max()` + cap polí.*
- **[Low] Soft-deleted řádky čitelné přes přímý PostgREST** — public SELECT politiky nekontrolují `deleted_at` (`match_results` `USING(true)`, `001:166`). App to filtruje, ale anon PostgREST vrátí smazané. *Fix: `AND deleted_at IS NULL` do politik.*
- **[Info] Cron secret non-constant-time + fail-open** (viz P0/5). **[Info] `weekly_schedule` RLS není v migracích** — tabulka jen `ALTER`ována (009,010), nikde `CREATE TABLE`/`ENABLE RLS`/policy → nelze ověřit ze zdroje. Ověřit v dashboardu a doplnit DDL do migrace.

**Ověřeno OK:** auth na všech 35 routách, XSS (DOMPurify + YouTube embed regex `[a-zA-Z0-9_-]{11}`), secrets jen server-side, password reset bez user-enumeration, upload (MIME allow-list + 5 MB + Sharp re-encode), image `remotePatterns` zamčené, žádné wildcard CORS.

---

## 🐞 Korektnost & integrita dat

- **[High] Smazané články veřejně čitelné** (viz P0/2) — `aktuality/[slug]/page.tsx:24-29`.
- **[High] Červencová sezóna `>= 6`** (viz P0/4) — `admin/matches/page.tsx:580`. Kanonicky je `>= 7` (srpen) — shodně `stats.ts:104`, `MatchResultsSection.tsx:29`, `utils.ts`. Liší se jen v červenci.
- **[High] Editace zápasu nepřepočítá starou sezónu** (viz P1/6) — `matches/[id]/route.ts:297-300`.
- **[Medium] Červencové tréninky do špatné sezóny** — `treninky/page.tsx:163` (`month >= 6`). Stejný bug jako matches.
- **[Medium] Ztráta gólů u legacy vícególového střelce** (viz P1/7) — `matches/page.tsx:384-386` vs `452-457`.
- **[Medium] Fire-and-forget recompute** (viz P1/8) — `matches/route.ts:217`, `[id]/route.ts:299,325`.
- **[Medium] Bare `getMonth()` na timestamptz** (viz P1/9) — `stats.ts:21,104` (server=UTC) vs `MatchResultsSection.tsx:29,34` (klient=Praha). Půlnoční zápas 1.8. Praha = 31.7. UTC → jiná sezóna/část na serveru vs klientu.
- **[Low] Slug dedup počítá i smazané** — `articles/route.ts:74-77` (chybí `deleted_at` filtr; update/publish ho mají). Kosmetika.
- **[Low] Standings parser** — `matches/page.tsx:190-214`. `split(/\t/)` + drop řádků `< 8` → space-separated vklad (z PDF) dá prázdnou tabulku; pozice se přečíslují indexem a skrytá ztráta řádku se neprojeví.
- **[Low] Hydratace/edge** — `plan-akci/PlanAkciClient.tsx:169-170` (`useState(now.getMonth())` bare); `matches/[id]` a `articles/[id]` GET-one nefiltrují `deleted_at` (admin, auth-gated).

**Ověřeno OK:** logika `recomputeSeasonStats` (appearances/goals/karty, půlka podzim/jaro), soft-delete na všech *veřejných* readech (kromě H1), `is_home`/venue auto-fill, home-only kalendářní událost, publish-to-article de-dup.

---

## ⚡ Výkon

- **[High] `/aktuality` načítá všech ~330 článků + všechny jejich obrázky bez pagination** — `aktuality/page.tsx:19-24`, `AktualityClient.tsx:112-200`. Join `article_images` vrací všechny řádky, klient použije jen `[0]`; pak renderuje celý seznam v framer-motion `StaggerItem`. **Fix:** pagination (`GET /api/articles` už `range`+`count` má — veřejná stránka ho obchází) + jen cover obrázek.
- **[High] Tým stránka: 4 full-table scany + `select("*")`** — `tym/page.tsx:42-49`. `match_scorers/cards/opponent_*` bez filtru (celé tabulky), `match_results.select("*")` táhne i free-text sloupce; `matchEvents` dělá `.find()` uvnitř smyčky → O(rows×matches). **Fix:** jen potřebné sloupce, `Map<match_id,match>`, filtr scorers/cards podle sezóny/ID.
- **[High] `ArticleDetail` je client a bundluje `marked` + `isomorphic-dompurify`** — `ArticleDetail.tsx:1,7-8,532-533`. Těžké parsery/sanitizer do klienta pro obsah, co se po publikaci nemění. **Fix:** parse+sanitize na serveru v `page.tsx`, předat hotové HTML.
- **[Medium] Logo LCP bez `sizes`** — `HomeClient.tsx:160-166` (`fill`+`priority`, box 96–128px → stáhne ~1080–1920px obraz). **Fix:** `sizes="(max-width:768px) 96px, 128px"`.
- **[Medium] Homepage tabulka bez sezónního filtru** — `page.tsx:69-72` → `HomeClient.tsx:514-517`. Chybí `.eq("season", currentSeason)` (jinde je), over-fetch + riziko duplicit pozic. **Fix:** doplnit filtr.
- **[Medium] Detail hráče: waterfall + duplicitní fetch** — `tym/[id]/page.tsx`. `generateMetadata` i page fetchují hráče zvlášť (bez `cache()`), pak sériové `matchLineups→matchResults`, `trainingAttendance` samostatně. **Fix:** `cache()` + `Promise.all` nezávislých dotazů.
- **[Low]** sekundární `ilike` po `Promise.all` (`page.tsx:98-110`); over-fetch obrázků na homepage (`:20`); admin `GET /api/matches` bez pagination (`matches/route.ts:45`).

**Ověřeno OK:** ISR `revalidate=3600` konzistentně, `revalidatePublicPages()` přes `revalidatePath("/", "layout")`, lean middleware (getUser jen `/admin/*`), žádné raw `<img>`, `next/dynamic` na 3 těžkých sekcích Tým, Inter self-hosted `display:swap`, server-only libs (`pdfkit`,`docx`) nikdy v klientu.

---

## ♿ Přístupnost

- **[High] Nepropojené `<label>`** (viz P1/13) — `plan-akci/RentalRequestForm.tsx` + admin formuláře (jen auth stránky mají `htmlFor`).
- **[Medium] Řádky zápasů neovladatelné klávesnicí** — `MatchResultsSection.tsx:334` (`<div onClick>` bez role/tabIndex/keydown). *Fix: `<button>` + `aria-expanded`.*
- **[Medium] Tabulka výsledků má rozbitou sémantiku** — `MatchResultsSection.tsx:333-390` (`<thead>` 6 sloupců, ale tělo je jeden `<td colSpan=6>`). *Fix: reálné `<td>` nebo list layout.*
- **[Medium] Lightbox není přístupný dialog** — `MatchGallery.tsx:87-94` (chybí `role="dialog"`/`aria-modal`, focus trap, návrat focusu). *Fix: dialog role + focus management.*
- **[Medium] Ikonová tlačítka kalendáře bez názvu** — `PlanAkciClient.tsx:432,443,563` (prev/next měsíc, zavřít). *Fix: `aria-label`.*
- **[Medium] Chybí skip-to-content + `<main id>`** — `(public)/layout.tsx:12`. *Fix: viditelný-on-focus skip link.*
- **[Medium] Kontrast patičky pod AA** — `Footer.tsx` (`text-gray-600` ≈2.5:1 na `#111`; `text-gray-500` ≈3.9:1). *Fix: `text-gray-400` ≈7.4:1.*
- **[Low]** ImageUploader mouse-only (admin); uploady bez alt (DB `alt` vždy null); hamburger bez `aria-expanded`; „taby" bez `aria-selected`/`aria-pressed`; YouTube iframe bez `title`; barvou-only karty ŽK/ČK; validace bez `role="alert"`/`aria-invalid`.

**Ověřeno OK:** `<html lang="cs">`, JSON-LD validní a jen v rootu, mapové iframe mají `title`, galerie/ThemeToggle mají `aria-label`, kalendářní dny jsou reálné `<button>`/`<Link>`.

---

## 🔍 SEO

- **[High] Chybí `sitemap.ts` / `robots.ts`** (viz P1/10) — dynamický obsah (články, hráči) jen přes interní odkazy.
- **[Medium] Zápasové články nemají `<h1>`** — `ArticleDetail.tsx:558-577` (match větev renderuje `MatchScoreHeader` v `<span>`, první nadpis je `<h3>`). Oslabuje SEO hlavního typu obsahu. *Fix: `<h1>` s `article.title`.*
- **[Medium] Chybí výchozí OG obrázek** — `layout.tsx:20-24` (jen články mají og:image). Homepage/tym/plan-akci/o-klubu se na FB sdílí bez obrázku. *Fix: default OG v rootu.*
- **[Low]** hráči bez `openGraph`; žádné canonical URL; žádné Twitter Card; redirect vs. stránka konflikt (`/historie`, `/o-nas` existují i přes 301 v `next.config.ts:21-22` → osiřelé).

**Ověřeno OK:** `metadataBase`, článek `[slug]` má `generateMetadata`+OG, legacy redirecty 301 na správné cíle.

---

## 📦 Závislosti, konfigurace & build

- **[High] Next.js 16.2.1 → 16.2.9** (viz P0/3) — 11 zranitelností (3 high), včetně middleware/proxy bypass a SSRF. `npm audit fix` je vyřeší (bez major bumpu).
- **[High] `undici`+`ws` (transitivní)** — TLS bypass, header injection, WS DoS. `npm audit fix`.
- **[High] Chybí security headers** — `next.config.ts` bez `headers()` (viz P1/11). *Dobře: `remotePatterns` zamčené, `dangerouslyAllowSVG` není.*
- **[Medium] `dompurify` XSS advisory** — přes `isomorphic-dompurify@3.10.0`. Nízké reálné riziko (trusted autoři, plain `sanitize(string)`). *Fix: `isomorphic-dompurify@^3.18.0`.*
- **[Medium] `CRON_SECRET` fail-open** (viz P0/5).
- **[Low/dev]** `@babel/core`, `brace-expansion`, `js-yaml` (jen build-tool, mimo prod bundle). **[Low]** `resend`→`svix`→`uuid` (server-only, nízká reachability).
- **Build warning:** `middleware`→`proxy` (Next 16). Bezpečné migrovat: `npx @next/codemod@latest middleware-to-proxy .` (rename `middleware.ts`→`proxy.ts`, export `middleware`→`proxy`, `config` beze změny).
- **Config:** `tsconfig` strict ✓ (volitelně `noUncheckedIndexedAccess`); `.gitignore` `.env*` ✓ (PASS); `vercel.json` cron OK (region default US — pro CZ web `fra1`/`arn1` sníží latenci); žádné CI (žádný pre-merge `tsc`/`eslint` gate); chybí `typecheck` script.
- **Outdated majors:** typescript 6, eslint 10, @types/node 26, marked 18 (runtime — ověřit API), pdfkit/sharp 0.x. Žádné pre-release. Bezpečnostně relevantní řeší `npm audit fix`.

**Env:** všechny klíče z CLAUDE.md přítomné kromě `CRON_SECRET` (jen ve Vercelu). Žádný secret v `NEXT_PUBLIC_`. Server-only secrets ověřeny — 0 překryv s 43 `"use client"` soubory.

---

## 🧹 Kvalita kódu & udržovatelnost

**Top-line:** `tsc --noEmit` čistý · `npm run lint` **úplně rozbitý (0 souborů)** · 0× `any` · 10× `as unknown as` · ~26× non-null `!` · `getSeasonForDate` na 5 místech (1 s bugem) · 3 mrtvé komponenty + 2 nedosažitelné stránky + 1 osiřelý API resource + 3 nepoužité exporty · 2 god-componenty (1651 / 1019 ř.).

**TypeScript / přetypování** — global no-`any` pravidlo dodrženo (0×). Ale:
- 🟠 `page.tsx:80,121,131,193` a `aktuality/[slug]/page.tsx:32` — `as unknown as {…}` ručně redeklaruje DB tvary, obchází `database.ts`. *Fix: odvodit z `Database[...]["Row"]`.*
- 🟠 `MatchResultsSection.tsx:69,70,192,193` — `halftime_home!/away!` `!` na nullable → riziko `NaN`. Také `events/page.tsx:266,425` `location!`, `PlanAkciClient.tsx:583-620` `end_date!`. *Fix: null-guardy.*
- 🟡 to-one join casty `aktuality/[slug]/page.tsx:81,87,93`, `tym/[id]/page.tsx:151`; `matches/page.tsx:282`. *Fix: typovaný `one<T>()` helper.*

**Duplicita**
- 🔴 `getSeasonForDate` 5× (kanon `stats.ts:102`; kopie `MatchResultsSection.tsx:26`, `tym/[id]/page.tsx:103`, `treninky/page.tsx:158`) a `getSeasonHalf` 3× (`stats.ts:21`, `MatchResultsSection.tsx:33`, `matches/page.tsx:701`). *Fix: export z `stats.ts`, smazat kopie.*
- 🟠 ~30 API rout re-inlinuje `getUser()`+401 místo `getSession()`/`requireAdmin()` z `auth.ts` (použit jen v 1 routě).
- 🟡 `POSITIONS`/`POSITION_LABELS`, `LOCATIONS`/`LOCATION_LABELS` (tatáž mapa 2×); `EVENT_TYPE_COLORS` `utils.ts:176` vs lokál `PlanAkciClient.tsx:47`; FROM/ADMIN_EMAIL `email.ts:6,7` vs `cron/…:248-250`; URL `https://tjdolany.net` natvrdo `matches/page.tsx:1619,1620,1631`, `articles/page.tsx:249,250,261` vs `NEXT_PUBLIC_SITE_URL` jinde.

**Mrtvý kód**
- 🟠 `components/public/EventCard.tsx`, `PageNav.tsx`+`PageNavSpacer.tsx` — 0 importů; smazat.
- 🔴 `api/events/route.ts`+`[id]` (`future_events`) — žádný klient nevolá `/api/events` (jen dashboard count `admin/page.tsx:13`); smazat resource nebo dodělat UI.
- 🔴 `(public)/historie/` (175 ř.) a `(public)/o-nas/` (149 ř.) — `next.config.ts` je 301-redirectuje na `/o-klubu`, nikdy se nevykreslí; smazat složky.
- 🟡 `utils.ts` nepoužité exporty: `getSupabasePublicUrl:151`, `EVENT_TYPES:143`, `EVENT_TYPE_COLORS:176`. Žádné zakomentované bloky/nepoužité importy/nedosažitelné větve.

**Error handling**
- 🟠 `teams/[id]/route.ts:28` & `teams/route.ts:34` — `revalidatePublicPages()` uvnitř 400 (Zod fail) větve → zahodí celou ISR cache i na odmítnutém requestu. *Fix: revalidovat až po úspěchu.*
- 🟡 chybí `logAudit` u mutací `events`,`schedule`,`standings`,`draws`,`teams`,`trainings` (blokuje úzký `EntityType` union `audit.ts:4`); `audit.ts:19-31` try/catch je mrtvý (`insert()` nevyhazuje, vrací `{error}` → chyby se polykají).
- 🟡 admin save handlery `await fetch()` bez try/catch (`matches/page.tsx:486`, `events`, `players`, `teams`, `articles/new`) → network reject nechá tlačítko v „Ukládám…"; `deleteMatch:497-501` nekontroluje `res.ok` → selhané smazání vypadá úspěšně.
- 🟢 Chybové UX `alert(err?.error)` je konzistentní (pro 2–3 uživatele OK).

**Magic values** — `matches/page.tsx:580` `>= 6` (viz P0/4); 4 kontaktní e-maily v oběhu (`tjdolany@seznam.cz`, `tjdolany@gmail.com`, `info@tjdolany.net` `Footer.tsx:89` nezdokumentovaný, `onboarding@resend.dev`) — ověřit a zdokumentovat; sezónní floor `2020`/měsíc `7` jako opakované literály.

**God-componenty** — 🔴 `admin/matches/page.tsx` **1651 ř.** (~50 stavů, 3 taby v jednom); 🟠 `admin/events/page.tsx` **1019 ř.**. Velké-ale-koherentní: `HomeClient` 761, `PlanAkciClient` 673, `ArticleDetail` 617, `treninky` 597.

**Lint + tsc** — 🔴 `npm run lint` **rozbitý (0 souborů)**: `eslint.config.mjs` FlatCompat + eslint 9.39.4 + eslint-config-next 16.2.1 hází `TypeError: Converting circular structure to JSON`; `next lint` v Next 16 odstraněn. Důsledek: **žádné pravidlo se nevynucuje** (ani no-`any`). *Fix: migrovat config na nativní flat-config export z eslint-config-next 16.* 🟢 `tsc --noEmit` čistý (ale 10 `as unknown as` je pro tsc neviditelných).

---

## ✅ Co je už teď dobře

Auth na všech mutacích, DOMPurify + bezpečný YouTube embed, žádné secrets v klientu, `.env` v gitignore, ISR konzistentní, lean middleware, self-hosted fonty, `next/dynamic` code-splitting, zamčené image `remotePatterns`, `<html lang="cs">`, validní JSON-LD, soft-delete na veřejných readech (kromě 1 díry), `recomputeSeasonStats` logika správná, publish-to-article de-dup. Kanonická hranice sezóny (srpen) je správně na 4 z 6 míst — rozcházejí se jen dvě paste-import cesty.
