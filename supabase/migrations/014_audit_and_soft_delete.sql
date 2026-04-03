-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
  entity_type text NOT NULL CHECK (entity_type IN ('article', 'match', 'calendar_event', 'player')),
  entity_id text NOT NULL,
  entity_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read audit log"
  ON public.audit_log FOR SELECT USING (auth.uid() IS NOT NULL);

-- Soft delete columns
ALTER TABLE public.articles ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.match_results ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.calendar_events ADD COLUMN deleted_at timestamptz;
