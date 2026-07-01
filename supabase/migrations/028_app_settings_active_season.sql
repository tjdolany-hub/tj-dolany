-- App-wide settings: admin-controlled "active season" that drives what the
-- homepage and squad page show as the current season (instead of deriving it
-- purely from the date). Switching it makes those pages display the new season
-- (empty stats until matches are added) — old seasons stay in the DB and remain
-- viewable via the season pickers.

create table if not exists public.app_settings (
  id int primary key default 1,
  active_season text,
  updated_at timestamptz default now(),
  constraint app_settings_singleton check (id = 1)
);

-- Ensure the singleton row exists (null active_season = fall back to date-based).
insert into public.app_settings (id, active_season)
  values (1, null)
  on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- Public read (homepage reads it via the anon client).
create policy "Anyone can read app settings"
  on public.app_settings for select using (true);

-- Only the service-role key (admin API route) may write it.
create policy "Service role manages app settings"
  on public.app_settings for all to service_role using (true) with check (true);
