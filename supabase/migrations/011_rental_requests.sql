-- Rental requests for private/public events
CREATE TABLE rental_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT,
  event_type TEXT NOT NULL DEFAULT 'pronajem' CHECK (event_type IN ('pronajem', 'volne')),
  organizer TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  location TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  time TEXT,
  all_day BOOLEAN NOT NULL DEFAULT false,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rental_requests ENABLE ROW LEVEL SECURITY;
