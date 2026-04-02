-- ============================================================
-- Migration 002: Schema updates for restructured admin
-- - Players: first_name, last_name, nickname, preferred_foot
-- - Calendar Events: organizer field
-- - Match Results: halftime scores, venue
-- - Match Lineups: is_starter flag
-- - Match Scorers: minute
-- - New table: match_cards (yellow/red cards)
-- ============================================================

-- Players — extended fields
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS preferred_foot text;

-- Calendar Events — organizer
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS organizer text;

-- Match Results — halftime + venue
ALTER TABLE public.match_results ADD COLUMN IF NOT EXISTS halftime_home int;
ALTER TABLE public.match_results ADD COLUMN IF NOT EXISTS halftime_away int;
ALTER TABLE public.match_results ADD COLUMN IF NOT EXISTS venue text;

-- Match Lineups — starter vs substitute
ALTER TABLE public.match_lineups ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT true;

-- Match Scorers — minute of goal
ALTER TABLE public.match_scorers ADD COLUMN IF NOT EXISTS minute int;

-- Match Cards (yellow/red)
CREATE TABLE IF NOT EXISTS public.match_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.match_results(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  card_type text NOT NULL CHECK (card_type IN ('yellow', 'red')),
  minute int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_cards_match ON public.match_cards(match_id);

ALTER TABLE public.match_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read match cards"
  ON public.match_cards FOR SELECT USING (true);

CREATE POLICY "Auth users can manage match cards"
  ON public.match_cards FOR ALL USING (auth.role() = 'authenticated');
