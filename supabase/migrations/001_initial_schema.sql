-- ============================================================
-- TJ Dolany - Database Schema
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

-- Articles (aktuality, posts, referáty)
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  summary text,
  category text not null default 'aktuality' check (category in ('aktuality', 'fotbal', 'sokolovna', 'oznameni')),
  published boolean not null default false,
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_articles_slug on public.articles(slug);
create index idx_articles_published on public.articles(published, created_at desc);

-- Article images
create table public.article_images (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_article_images_article on public.article_images(article_id, sort_order);

-- Players
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text not null check (position in ('brankar', 'obrance', 'zaloznik', 'utocnik')),
  number int,
  photo text,
  description text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Calendar events
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date timestamptz not null,
  end_date timestamptz,
  event_type text not null default 'akce' check (event_type in ('zapas', 'trenink', 'akce', 'pronajem', 'volne')),
  location text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_calendar_events_date on public.calendar_events(date);

-- Match results
create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null,
  opponent text not null,
  score_home int not null default 0,
  score_away int not null default 0,
  is_home boolean not null default true,
  competition text,
  summary text,
  article_id uuid references public.articles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_match_results_date on public.match_results(date desc);

-- Season draws (losy soutěže)
create table public.season_draws (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  title text not null,
  image text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Future events (plánované akce s plakátem)
create table public.future_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date timestamptz not null,
  poster text,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_future_events_date on public.future_events(date);

-- Photo albums
create table public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_url text,
  event_date timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_photo_albums_slug on public.photo_albums(slug);

-- Photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_photos_album on public.photos(album_id, sort_order);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.article_images enable row level security;
alter table public.players enable row level security;
alter table public.calendar_events enable row level security;
alter table public.match_results enable row level security;
alter table public.season_draws enable row level security;
alter table public.future_events enable row level security;
alter table public.photo_albums enable row level security;
alter table public.photos enable row level security;

-- Public read access
create policy "Public can read published articles"
  on public.articles for select using (published = true);

create policy "Public can read article images"
  on public.article_images for select
  using (exists (select 1 from public.articles where id = article_id and published = true));

create policy "Public can read active players"
  on public.players for select using (active = true);

create policy "Public can read public calendar events"
  on public.calendar_events for select using (is_public = true);

create policy "Public can read match results"
  on public.match_results for select using (true);

create policy "Public can read active season draws"
  on public.season_draws for select using (active = true);

create policy "Public can read published future events"
  on public.future_events for select using (published = true);

create policy "Public can read published photo albums"
  on public.photo_albums for select using (published = true);

create policy "Public can read photos from published albums"
  on public.photos for select
  using (exists (select 1 from public.photo_albums where id = album_id and published = true));

-- Authenticated (admin/editor) full access
create policy "Auth users can manage profiles"
  on public.profiles for all using (auth.uid() = id);

create policy "Auth users can manage articles"
  on public.articles for all using (auth.role() = 'authenticated');

create policy "Auth users can manage article images"
  on public.article_images for all using (auth.role() = 'authenticated');

create policy "Auth users can manage players"
  on public.players for all using (auth.role() = 'authenticated');

create policy "Auth users can manage calendar events"
  on public.calendar_events for all using (auth.role() = 'authenticated');

create policy "Auth users can manage match results"
  on public.match_results for all using (auth.role() = 'authenticated');

create policy "Auth users can manage season draws"
  on public.season_draws for all using (auth.role() = 'authenticated');

create policy "Auth users can manage future events"
  on public.future_events for all using (auth.role() = 'authenticated');

create policy "Auth users can manage photo albums"
  on public.photo_albums for all using (auth.role() = 'authenticated');

create policy "Auth users can manage photos"
  on public.photos for all using (auth.role() = 'authenticated');

-- ============================================================
-- Storage bucket for photos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "Public can view photos"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "Auth users can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "Auth users can update photos"
  on storage.objects for update
  using (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "Auth users can delete photos"
  on storage.objects for delete
  using (bucket_id = 'photos' and auth.role() = 'authenticated');

-- ============================================================
-- Functions
-- ============================================================

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger articles_updated_at
  before update on public.articles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email), 'editor');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
