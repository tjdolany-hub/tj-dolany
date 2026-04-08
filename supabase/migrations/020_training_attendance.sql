-- Trainings table: each row = one training session or match event
CREATE TABLE IF NOT EXISTS trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'trenink' CHECK (type IN ('trenink', 'zapas')),
  season TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: no duplicate training on same date+title
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainings_date_title ON trainings (date, title);

-- Training attendance: each row = one player's response to one training
CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  response TEXT NOT NULL DEFAULT 'neodpovedel' CHECK (response IN ('jde', 'nejde', 'neodpovedel')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (training_id, player_id)
);

-- Index for fast player stats lookup
CREATE INDEX IF NOT EXISTS idx_training_attendance_player ON training_attendance (player_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_training ON training_attendance (training_id);

-- RLS
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

-- Read for all authenticated
CREATE POLICY "trainings_select" ON trainings FOR SELECT USING (true);
CREATE POLICY "training_attendance_select" ON training_attendance FOR SELECT USING (true);

-- Write for service role only (enforced by using createServiceClient in API)
