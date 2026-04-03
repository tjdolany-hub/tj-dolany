-- Add all_day flag to calendar_events (previously inferred from time being 00:00)
ALTER TABLE public.calendar_events ADD COLUMN all_day boolean NOT NULL DEFAULT false;

-- Add time_to and end_date to rental_requests for time range and multi-day support
ALTER TABLE public.rental_requests ADD COLUMN time_to text;
ALTER TABLE public.rental_requests ADD COLUMN end_date timestamptz;
