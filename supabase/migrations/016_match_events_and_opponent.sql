-- 016: Add penalty flag to match_scorers, structured opponent data tables

-- 1) Add is_penalty to match_scorers
ALTER TABLE match_scorers
  ADD COLUMN IF NOT EXISTS is_penalty BOOLEAN NOT NULL DEFAULT false;

-- 2) Structured opponent scorers (replaces free-text opponent_scorers)
CREATE TABLE IF NOT EXISTS match_opponent_scorers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  minute INT,
  is_penalty BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Structured opponent cards (replaces free-text opponent_cards)
CREATE TABLE IF NOT EXISTS match_opponent_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('yellow', 'red')),
  minute INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Opponent lineup
CREATE TABLE IF NOT EXISTS match_opponent_lineup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INT,
  position TEXT,
  is_starter BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) RLS policies
ALTER TABLE match_opponent_scorers ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_opponent_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_opponent_lineup ENABLE ROW LEVEL SECURITY;

-- Anon SELECT
CREATE POLICY "anon_select_opponent_scorers" ON match_opponent_scorers
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_opponent_cards" ON match_opponent_cards
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_opponent_lineup" ON match_opponent_lineup
  FOR SELECT TO anon USING (true);

-- Authenticated SELECT
CREATE POLICY "auth_select_opponent_scorers" ON match_opponent_scorers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select_opponent_cards" ON match_opponent_cards
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select_opponent_lineup" ON match_opponent_lineup
  FOR SELECT TO authenticated USING (true);

-- Service role ALL
CREATE POLICY "service_all_opponent_scorers" ON match_opponent_scorers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_opponent_cards" ON match_opponent_cards
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_opponent_lineup" ON match_opponent_lineup
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opponent_scorers_match ON match_opponent_scorers(match_id);
CREATE INDEX IF NOT EXISTS idx_opponent_cards_match ON match_opponent_cards(match_id);
CREATE INDEX IF NOT EXISTS idx_opponent_lineup_match ON match_opponent_lineup(match_id);
