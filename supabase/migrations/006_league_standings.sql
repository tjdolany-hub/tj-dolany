-- League standings table for manual entry
CREATE TABLE IF NOT EXISTS public.league_standings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  season text NOT NULL,
  position int NOT NULL,
  team_name text NOT NULL,
  matches_played int DEFAULT 0,
  wins int DEFAULT 0,
  draws int DEFAULT 0,
  losses int DEFAULT 0,
  goals_for int DEFAULT 0,
  goals_against int DEFAULT 0,
  points int DEFAULT 0,
  is_our_team boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.league_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League standings are publicly readable"
  ON public.league_standings FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage league standings"
  ON public.league_standings FOR ALL USING (auth.role() = 'authenticated');
