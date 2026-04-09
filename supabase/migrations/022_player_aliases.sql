-- Add aliases column for alternative name matching (e.g., "Jirka Berger" -> "Jiří Berger")
ALTER TABLE players ADD COLUMN aliases text[] DEFAULT '{}';
