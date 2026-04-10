-- Fix three RLS holes discovered via anon-key probing:
--
-- 1. audit_log "Service role full access on audit_log" — FOR ALL on {public}
--    with USING(true) let anon clients read and write the audit log.
-- 2. match_lineups "Auth write" — FOR ALL on {public} with USING(true) let
--    anon clients insert/update/delete lineup rows.
-- 3. match_scorers "Auth write" — same issue as match_lineups.
--
-- Fix: drop the over-permissive policies and recreate them restricted to the
-- right role (authenticated for admin UI, service_role for server routes).

-- ── audit_log ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access on audit_log" ON public.audit_log;

-- Only server-side service_role key may write to the audit log.
CREATE POLICY "Service role can write audit log"
  ON public.audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- (Existing SELECT policy "Auth users can read audit log" already restricts
--  reads to logged-in users via auth.uid() IS NOT NULL — left untouched.)

-- ── match_lineups ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Auth write" ON public.match_lineups;

CREATE POLICY "Auth users can manage match lineups"
  ON public.match_lineups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── match_scorers ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Auth write" ON public.match_scorers;

CREATE POLICY "Auth users can manage match scorers"
  ON public.match_scorers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
