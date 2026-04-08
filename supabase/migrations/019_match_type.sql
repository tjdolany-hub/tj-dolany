-- Add match_type column to distinguish league vs friendly matches
ALTER TABLE match_results
ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'mistrovsky'
CHECK (match_type IN ('mistrovsky', 'pratelsky'));

-- Change match_number from TEXT to INTEGER for proper sequencing
-- First, convert existing data
ALTER TABLE match_results
ADD COLUMN IF NOT EXISTS match_number_int INTEGER;

-- Copy existing match_number values (if any are numeric strings)
UPDATE match_results
SET match_number_int = match_number::INTEGER
WHERE match_number IS NOT NULL AND match_number ~ '^\d+$';

-- We keep the old match_number column for backward compat
-- The new match_number_int will be used for auto-numbering
