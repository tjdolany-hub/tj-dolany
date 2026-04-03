-- Add description field to rental_requests (public event description for calendar)
ALTER TABLE rental_requests ADD COLUMN description TEXT;
