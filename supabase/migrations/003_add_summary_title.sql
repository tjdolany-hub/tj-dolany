-- Add summary_title column to match_results
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS summary_title TEXT;
