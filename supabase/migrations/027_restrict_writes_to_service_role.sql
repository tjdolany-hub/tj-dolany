-- Defense-in-depth (Medium): the "Auth users can manage X" policies from
-- migration 001 are FOR ALL to authenticated, so any editor can INSERT/UPDATE/
-- DELETE content rows directly via PostgREST — bypassing the app's soft-delete
-- (hard DELETE without going through the trash), the "permanent delete = admin
-- only" rule, and audit logging (which only happens in the API routes).
--
-- The app already performs every content mutation with the service-role key
-- (createServiceClient), so restricting writes to service_role is compatible
-- with the admin UI. Authenticated users keep FULL read access (needed so the
-- admin panel can see unpublished / inactive / private rows), but can no longer
-- write directly. This also closes the soft-deleted-row exposure on public
-- SELECT by adding `deleted_at is null` where that column exists (migration 014:
-- articles, match_results, calendar_events).
--
-- ⚠ APPLY WITH VERIFICATION: after applying, exercise the admin panel end to end
--   (create/edit/delete an article, match, event, player; view unpublished items;
--   restore from trash). Roll back by re-running migration 001's policies if any
--   write path turns out to use the anon client instead of the service client.

-- Helper pattern per table: drop the FOR ALL authenticated policy, add a
-- read-all policy for authenticated, and a FOR ALL policy for service_role.

-- ── articles ─────────────────────────────────────────────────────────────
drop policy if exists "Auth users can manage articles" on public.articles;
create policy "Auth users can read all articles"
  on public.articles for select to authenticated using (true);
create policy "Service role can manage articles"
  on public.articles for all to service_role using (true) with check (true);
drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
  on public.articles for select using (published = true and deleted_at is null);

-- ── article_images ───────────────────────────────────────────────────────
drop policy if exists "Auth users can manage article images" on public.article_images;
create policy "Auth users can read all article images"
  on public.article_images for select to authenticated using (true);
create policy "Service role can manage article images"
  on public.article_images for all to service_role using (true) with check (true);
drop policy if exists "Public can read article images" on public.article_images;
create policy "Public can read article images"
  on public.article_images for select
  using (exists (select 1 from public.articles
                 where id = article_id and published = true and deleted_at is null));

-- ── players ──────────────────────────────────────────────────────────────
drop policy if exists "Auth users can manage players" on public.players;
create policy "Auth users can read all players"
  on public.players for select to authenticated using (true);
create policy "Service role can manage players"
  on public.players for all to service_role using (true) with check (true);

-- ── calendar_events ──────────────────────────────────────────────────────
drop policy if exists "Auth users can manage calendar events" on public.calendar_events;
create policy "Auth users can read all calendar events"
  on public.calendar_events for select to authenticated using (true);
create policy "Service role can manage calendar events"
  on public.calendar_events for all to service_role using (true) with check (true);
drop policy if exists "Public can read public calendar events" on public.calendar_events;
create policy "Public can read public calendar events"
  on public.calendar_events for select using (is_public = true and deleted_at is null);

-- ── match_results ────────────────────────────────────────────────────────
drop policy if exists "Auth users can manage match results" on public.match_results;
create policy "Auth users can read all match results"
  on public.match_results for select to authenticated using (true);
create policy "Service role can manage match results"
  on public.match_results for all to service_role using (true) with check (true);
drop policy if exists "Public can read match results" on public.match_results;
create policy "Public can read match results"
  on public.match_results for select using (deleted_at is null);

-- ── season_draws ─────────────────────────────────────────────────────────
drop policy if exists "Auth users can manage season draws" on public.season_draws;
create policy "Auth users can read all season draws"
  on public.season_draws for select to authenticated using (true);
create policy "Service role can manage season draws"
  on public.season_draws for all to service_role using (true) with check (true);

-- ── future_events ────────────────────────────────────────────────────────
drop policy if exists "Auth users can manage future events" on public.future_events;
create policy "Auth users can read all future events"
  on public.future_events for select to authenticated using (true);
create policy "Service role can manage future events"
  on public.future_events for all to service_role using (true) with check (true);

-- ── photo_albums ─────────────────────────────────────────────────────────
drop policy if exists "Auth users can manage photo albums" on public.photo_albums;
create policy "Auth users can read all photo albums"
  on public.photo_albums for select to authenticated using (true);
create policy "Service role can manage photo albums"
  on public.photo_albums for all to service_role using (true) with check (true);

-- ── photos ───────────────────────────────────────────────────────────────
drop policy if exists "Auth users can manage photos" on public.photos;
create policy "Auth users can read all photos"
  on public.photos for select to authenticated using (true);
create policy "Service role can manage photos"
  on public.photos for all to service_role using (true) with check (true);
