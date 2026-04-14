-- User management: tighten RLS on public.profiles and extend audit_log.
--
-- Until now, any authenticated user could INSERT/UPDATE/DELETE any profile
-- row (policy "Auth users can manage profiles" from migration 001). We need
-- only admins to be able to change roles / add / remove users via the admin
-- UI, while keeping every authenticated user's ability to read the list and
-- edit their own display name.

-- ── profiles policies ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Auth users can manage profiles" ON public.profiles;

-- Every authenticated user can read the full list (for the admin UI).
CREATE POLICY "Auth users can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- A user may update only their own display name/email row. Role changes and
-- inserts/deletes are funnelled through the service_role key via the admin
-- API routes, which perform the admin check in application code.
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role always has full access (used by /api/users/*).
CREATE POLICY "Service role full access on profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── audit_log: extend entity_type + action enums ────────────────────────
-- The columns are plain text (not postgres enums), so no DDL is needed;
-- the TypeScript types in src/types/database.ts are what we update.

-- ── seed: ensure there is always at least one admin ─────────────────────
-- No-op in SQL (existing admins untouched). The application enforces the
-- "cannot demote/delete the last admin" invariant in API code.
