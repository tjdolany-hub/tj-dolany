-- Teams table for managing opponent team logos
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "teams_public_read" ON teams
  FOR SELECT USING (true);

-- Admin write access (authenticated users only)
CREATE POLICY "teams_auth_insert" ON teams
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "teams_auth_update" ON teams
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "teams_auth_delete" ON teams
  FOR DELETE TO authenticated USING (true);

-- Seed with existing teams
INSERT INTO teams (name, keywords, logo_url) VALUES
  ('AFK Hronov', ARRAY['hronov'], '/logos/afk-hronov.png'),
  ('FK Deštné/MFK N.Město B', ARRAY['destne', 'deštné', 'n.město', 'n. město', 'nmesto'], '/logos/fk-destne-mfk-nmesto-b.png'),
  ('JI Machov', ARRAY['machov'], '/logos/ji-machov.png'),
  ('SK Babí', ARRAY['babí', 'babi'], '/logos/sk-babi.png'),
  ('SK Č. Kostelec B', ARRAY['kostelec'], '/logos/sk-c-kostelec-b.png'),
  ('SK Č. Skalice B', ARRAY['skalice'], '/logos/sk-c-skalice-b.png'),
  ('SO V. Jesenice', ARRAY['jesenice'], '/logos/so-v-jesenice.png'),
  ('SO Hejtmánkovice', ARRAY['hejtmánkovice', 'hejtmankovice'], '/logos/so-hejtmankovice.png'),
  ('SO Stárkov', ARRAY['stárkov', 'starkov'], '/logos/so-starkov.png'),
  ('SO Zábrodí', ARRAY['zábrodí', 'zabrodi'], '/logos/so-zabrodi.png'),
  ('SP Police n.M. B', ARRAY['police'], '/logos/sp-police-nm-b.png'),
  ('TJ Velké Poříčí', ARRAY['velké poříčí', 'velke porici', 'poříčí', 'porici'], '/logos/tj-velke-porici.png');
