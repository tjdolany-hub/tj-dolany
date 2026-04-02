-- Match images table for photo galleries per match
CREATE TABLE IF NOT EXISTS public.match_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.match_results(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.match_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match images are publicly readable"
  ON public.match_images FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage match images"
  ON public.match_images FOR ALL
  USING (auth.role() = 'authenticated');
