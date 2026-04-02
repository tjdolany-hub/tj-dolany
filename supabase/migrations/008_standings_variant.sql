-- Add variant column to league_standings (celkem, doma, venku)
ALTER TABLE league_standings ADD COLUMN variant text NOT NULL DEFAULT 'celkem';

-- Drop existing rows so they can be re-imported with variant
-- (table was either empty or had only 'celkem' data)
