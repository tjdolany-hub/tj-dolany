import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const [articlesResult, pastEventResult, futureEventsResult, matchResult, albumsResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, slug, summary, category, created_at, updated_at, article_images(url, alt)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(5),
    // Last past TJ event (akce/volne only)
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type")
      .in("event_type", ["akce", "volne"])
      .eq("is_public", true)
      .lt("date", now)
      .order("date", { ascending: false })
      .limit(1),
    // Next 2 future TJ events (akce/volne only)
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type")
      .in("event_type", ["akce", "volne"])
      .eq("is_public", true)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(2),
    supabase
      .from("calendar_events")
      .select("title, date, location")
      .eq("event_type", "zapas")
      .eq("is_public", true)
      .gte("date", now)
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

  type CalEvent = { id: string; title: string; description: string | null; date: string; event_type: string; articleSlug?: string | null };
  const pastEvent = (pastEventResult.data?.[0] ?? null) as CalEvent | null;
  const futureEvents = (futureEventsResult.data ?? []) as CalEvent[];

  // Try to find an article for the past event (by searching title words)
  if (pastEvent) {
    const searchTerm = pastEvent.title.split(" ").slice(0, 3).join(" ");
    const { data: matchingArticles } = await supabase
      .from("articles")
      .select("slug")
      .eq("published", true)
      .ilike("title", `%${searchTerm}%`)
      .limit(1);
    if (matchingArticles && matchingArticles.length > 0) {
      pastEvent.articleSlug = matchingArticles[0].slug;
    }
  }

  // Build 3-card array: [past, next (highlighted), future]
  const heroEvents = [
    pastEvent,
    futureEvents[0] ?? null,
    futureEvents[1] ?? null,
  ];

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
      heroEvents={heroEvents}
      nextMatch={nextMatch}
      albums={albums}
    />
  );
}
