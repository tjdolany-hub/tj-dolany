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

  // ── Club banner data ──
  // Last 5 played matches (for form: V/R/P)
  const { data: recentMatches } = await supabase
    .from("match_results")
    .select("id, date, opponent, score_home, score_away, is_home, competition, season, article_id, articles(slug)")
    .lt("date", now)
    .order("date", { ascending: false })
    .limit(5);

  // All scorers + cards for current season for top scorer / most cards
  const { data: allScorers } = await supabase
    .from("match_scorers")
    .select("player_id, goals, players(name)");
  const { data: allCards } = await supabase
    .from("match_cards")
    .select("player_id, card_type, players(name)");

  // League position
  const { data: standings } = await supabase
    .from("league_standings")
    .select("position, team_name, points")
    .eq("is_our_team", true)
    .limit(1);

  // Compute top scorer
  const scorerMap = new Map<string, { name: string; goals: number }>();
  (allScorers ?? []).forEach((s: { player_id: string; goals: number; players: { name: string } | null }) => {
    const existing = scorerMap.get(s.player_id);
    if (existing) existing.goals += s.goals;
    else scorerMap.set(s.player_id, { name: s.players?.name || "?", goals: s.goals });
  });
  const topScorer = [...scorerMap.values()].sort((a, b) => b.goals - a.goals)[0] ?? null;

  // Compute most cards (red = 2 points, yellow = 1)
  const cardMap = new Map<string, { name: string; yellows: number; reds: number; score: number }>();
  (allCards ?? []).forEach((c: { player_id: string; card_type: string; players: { name: string } | null }) => {
    const existing = cardMap.get(c.player_id) || { name: c.players?.name || "?", yellows: 0, reds: 0, score: 0 };
    if (c.card_type === "red") { existing.reds++; existing.score += 2; }
    else { existing.yellows++; existing.score += 1; }
    cardMap.set(c.player_id, existing);
  });
  const topCards = [...cardMap.values()].sort((a, b) => b.score - a.score)[0] ?? null;

  // Build form array (last 5 results: V/R/P)
  type FormResult = "V" | "R" | "P";
  const form: FormResult[] = (recentMatches ?? []).map((m: { score_home: number; score_away: number; is_home: boolean }) => {
    const our = m.is_home ? m.score_home : m.score_away;
    const their = m.is_home ? m.score_away : m.score_home;
    if (our > their) return "V" as FormResult;
    if (our < their) return "P" as FormResult;
    return "R" as FormResult;
  });

  // Last match
  const lastMatch = recentMatches?.[0] as { id: string; date: string; opponent: string; score_home: number; score_away: number; is_home: boolean; articles: { slug: string } | null } | undefined ?? null;

  const clubBanner = {
    form,
    topScorer,
    topCards,
    lastMatch: lastMatch ? {
      opponent: lastMatch.opponent,
      score_home: lastMatch.score_home,
      score_away: lastMatch.score_away,
      is_home: lastMatch.is_home,
      articleSlug: lastMatch.articles?.slug ?? null,
    } : null,
    leaguePosition: standings?.[0]?.position ?? null,
  };

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
      clubBanner={clubBanner}
    />
  );
}
