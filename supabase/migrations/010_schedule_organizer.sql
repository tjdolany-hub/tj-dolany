-- Add organizer field to weekly_schedule (same as calendar_events)
ALTER TABLE weekly_schedule ADD COLUMN organizer text;
