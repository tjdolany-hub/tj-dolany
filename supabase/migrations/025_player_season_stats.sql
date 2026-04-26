-- Pre-aggregated player statistics per season+half
-- Recomputed automatically when match data changes via API
CREATE TABLE IF NOT EXISTS player_season_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season text NOT NULL,
  half text NOT NULL CHECK (half IN ('podzim', 'jaro')),
  matches int NOT NULL DEFAULT 0,
  goals int NOT NULL DEFAULT 0,
  yellows int NOT NULL DEFAULT 0,
  reds int NOT NULL DEFAULT 0,
  UNIQUE (player_id, season, half)
);

CREATE INDEX idx_player_season_stats_season ON player_season_stats(season);

ALTER TABLE player_season_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read player_season_stats"
  ON player_season_stats FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage player_season_stats"
  ON player_season_stats FOR ALL
  USING (true)
  WITH CHECK (true);
