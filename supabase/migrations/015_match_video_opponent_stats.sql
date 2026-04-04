-- Add video URL and opponent free-text scorers/cards to match_results
ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS opponent_scorers TEXT,
  ADD COLUMN IF NOT EXISTS opponent_cards TEXT;
