-- Add match detail fields (round, referee, delegate, spectators, match_number)
ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS round TEXT,
  ADD COLUMN IF NOT EXISTS referee TEXT,
  ADD COLUMN IF NOT EXISTS delegate TEXT,
  ADD COLUMN IF NOT EXISTS spectators INTEGER,
  ADD COLUMN IF NOT EXISTS match_number TEXT;

-- Add jersey number to lineups (per-match, both Dolany and opponent)
ALTER TABLE match_lineups
  ADD COLUMN IF NOT EXISTS number INTEGER;
