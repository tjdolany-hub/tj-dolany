import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const [articlesResult, eventsResult, matchResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, slug, summary, category, created_at, updated_at, article_images(url, alt)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("future_events")
      .select("id, title, description, date, poster")
      .eq("published", true)
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(6),
    supabase
      .from("calendar_events")
      .select("title, date, location")
      .eq("event_type", "zapas")
      .eq("is_public", true)
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(1),
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

  return (
    <HomeClient
      articles={articles}
      events={events}
      nextMatch={nextMatch}
    />
  );
}
