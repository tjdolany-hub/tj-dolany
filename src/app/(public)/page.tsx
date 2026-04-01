import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const [articlesResult, eventsResult, matchResult, albumsResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, slug, summary, category, created_at, updated_at, article_images(url, alt)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("future_events")
      .select("id, title, description, date, poster")
      .eq("published", true)
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(4),
    supabase
      .from("calendar_events")
      .select("title, date, location")
      .eq("event_type", "zapas")
      .eq("is_public", true)
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(1),
    supabase
      .from("photo_albums")
      .select("id, title, slug, cover_url, event_date")
      .eq("published", true)
      .order("event_date", { ascending: false })
      .limit(4),
  ]);

  const articles = ((articlesResult.data ?? []) as unknown as {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    category: string;
    created_at: string;
    updated_at: string;
    article_images: { url: string; alt: string | null }[];
  }[]).map((a) => ({
    ...a,
    article_images: a.article_images ?? [],
  }));

  const events = (eventsResult.data ?? []) as unknown as {
    id: string;
    title: string;
    description: string | null;
    date: string;
    poster: string | null;
  }[];

  const matchData = matchResult.data;
  const nextMatch = matchData && matchData.length > 0
    ? matchData[0] as unknown as { title: string; date: string; location: string | null }
    : null;

  const albums = (albumsResult.data ?? []) as unknown as {
    id: string;
    title: string;
    slug: string;
    cover_url: string | null;
    event_date: string | null;
  }[];

  return (
    <HomeClient
      articles={articles}
      events={events}
      nextMatch={nextMatch}
      albums={albums}
    />
  );
}
