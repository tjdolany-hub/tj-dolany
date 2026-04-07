-- 017: Add captain flag to match lineups

ALTER TABLE match_lineups
  ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE match_opponent_lineup
  ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT false;
