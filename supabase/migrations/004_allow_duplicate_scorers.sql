-- Allow same player to appear multiple times in match_scorers (one row per goal)
-- Drop unique constraint on (match_id, player_id) if it exists
DO $$
BEGIN
  -- Check and drop any unique constraint on match_scorers(match_id, player_id)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.match_scorers'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.match_scorers DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'public.match_scorers'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 2
      LIMIT 1
    );
  END IF;
END $$;
