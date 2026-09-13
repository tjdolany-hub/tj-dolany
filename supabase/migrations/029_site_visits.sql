-- Anonymous daily visitor counter (footer "Návštěvnost").
-- One row per unique visitor per day. visitor_hash = HMAC(day|ip|user-agent)
-- computed server-side; the key changes meaning every day, so the same visitor
-- can't be linked across days and no IP or cookie is stored.

create table if not exists public.site_visits (
  day date not null,
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  primary key (day, visitor_hash)
);

alter table public.site_visits enable row level security;

-- No public access: reads and writes go through /api/visits (service role).
create policy "Service role can manage site_visits"
  on public.site_visits for all to service_role using (true) with check (true);
