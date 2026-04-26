import { createClient } from "@/lib/supabase/server";
import { getSeasonForDate } from "@/lib/stats";
import HomeClient from "./HomeClient";

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = await createClient();

  const now = new Date().toISOString();
  const currentSeason = getSeasonForDate(new Date());

  const [
    articlesResult, pastEventResult, futureEventsResult, matchResult, albumsResult,
    recentMatchesResult, standingsResult, allStandingsResult,
    seasonStatsResult, teamsResult,
  ] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, slug, summary, category, created_at, updated_at, article_images(url, alt)")
      .eq("published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type")
      .eq("event_type", "akce")
      .eq("is_public", true)
      .is("deleted_at", null)
      .lt("date", now)
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type")
      .eq("event_type", "akce")
      .eq("is_public", true)
      .is("deleted_at", null)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(2),
    supabase
      .from("match_results")
      .select("opponent, date, is_home, competition, venue")
      .is("deleted_at", null)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(1),
    supabase
      .from("photo_albums")
      .select("id, title, slug, cover_url, event_date")
      .eq("published", true)
      .order("event_date", { ascending: false })
      .limit(4),
    supabase
      .from("match_results")
      .select("id, date, opponent, score_home, score_away, is_home, competition, season, article_id, articles(slug)")
      .is("deleted_at", null)
      .lt("date", now)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("league_standings")
      .select("position, team_name, points")
      .eq("is_our_team", true)
      .eq("variant", "celkem")
      .limit(1),
    supabase
      .from("league_standings")
      .select("position, team_name, matches_played, wins, draws, losses, goals_for, goals_against, points, is_our_team, variant")
      .order("position", { ascending: true }),
    supabase
      .from("player_season_stats")
      .select("player_id, season, matches, goals, yellows, reds, players(name)")
      .eq("season", currentSeason),
    supabase.from("teams").select("keywords, logo_url").order("name"),
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

  if (pastEvent) {
    const searchTerm = pastEvent.title.split(" ").slice(0, 3).join(" ");
    const { data: matchingArticles } = await supabase
      .from("articles")
      .select("slug")
      .eq("published", true)
      .is("deleted_at", null)
      .ilike("title", `%${searchTerm}%`)
      .limit(1);
    if (matchingArticles && matchingArticles.length > 0) {
      pastEvent.articleSlug = matchingArticles[0].slug;
    }
  }

  const heroEvents = [
    pastEvent,
    futureEvents[0] ?? null,
    futureEvents[1] ?? null,
  ];

  const matchData = matchResult.data;
  const nextMatch = matchData && matchData.length > 0
    ? (() => {
        const m = matchData[0] as unknown as { opponent: string; date: string; is_home: boolean; venue: string | null };
        const title = m.is_home ? `Dolany - ${m.opponent}` : `${m.opponent} - Dolany`;
        return { title, date: m.date, location: m.venue ?? (m.is_home ? "Dolany" : null), opponent: m.opponent, is_home: m.is_home };
      })()
    : null;

  // ── Club banner data from pre-aggregated stats ──
  const recentMatches = recentMatchesResult.data;
  const standings = standingsResult.data;
  const allStandings = allStandingsResult.data;
  const seasonStats = (seasonStatsResult.data ?? []) as unknown as {
    player_id: string; season: string; matches: number; goals: number; yellows: number; reds: number;
    players: { name: string } | null;
  }[];

  // Aggregate per-player (stats table has podzim/jaro rows)
  const playerAgg = new Map<string, { name: string; matches: number; goals: number; yellows: number; reds: number }>();
  for (const s of seasonStats) {
    const existing = playerAgg.get(s.player_id);
    if (existing) {
      existing.matches += s.matches;
      existing.goals += s.goals;
      existing.yellows += s.yellows;
      existing.reds += s.reds;
    } else {
      playerAgg.set(s.player_id, {
        name: s.players?.name || "?",
        matches: s.matches,
        goals: s.goals,
        yellows: s.yellows,
        reds: s.reds,
      });
    }
  }

  const topScorer = [...playerAgg.values()].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals)[0] ?? null;

  const topCards = [...playerAgg.values()]
    .filter((p) => p.yellows > 0 || p.reds > 0)
    .map((p) => ({ ...p, score: p.reds * 2 + p.yellows }))
    .sort((a, b) => b.score - a.score)[0] ?? null;

  type FormResult = "V" | "R" | "P";
  const form: FormResult[] = (recentMatches ?? []).map((m: { score_home: number; score_away: number; is_home: boolean }) => {
    const our = m.is_home ? m.score_home : m.score_away;
    const their = m.is_home ? m.score_away : m.score_home;
    if (our > their) return "V" as FormResult;
    if (our < their) return "P" as FormResult;
    return "R" as FormResult;
  });

  const lastMatch = recentMatches?.[0] as { id: string; date: string; opponent: string; score_home: number; score_away: number; is_home: boolean; articles: { slug: string } | null } | undefined ?? null;

  const clubBanner = {
    form,
    topScorer: topScorer ? { name: topScorer.name, goals: topScorer.goals } : null,
    topCards: topCards ? { name: topCards.name, yellows: topCards.yellows, reds: topCards.reds, score: topCards.score } : null,
    lastMatch: lastMatch ? {
      opponent: lastMatch.opponent,
      score_home: lastMatch.score_home,
      score_away: lastMatch.score_away,
      is_home: lastMatch.is_home,
      articleSlug: lastMatch.articles?.slug ?? null,
    } : null,
    leaguePosition: standings?.[0]?.position ?? null,
  };

  const top5Scorers = [...playerAgg.values()].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 6);
  const top5Appearances = [...playerAgg.values()].filter((p) => p.matches > 0).sort((a, b) => b.matches - a.matches).slice(0, 6).map((p) => ({ name: p.name, count: p.matches }));

  const teams = (teamsResult.data ?? []) as { keywords: string[]; logo_url: string | null }[];

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
      leagueStandings={(allStandings ?? []) as { position: number; team_name: string; matches_played: number; wins: number; draws: number; losses: number; goals_for: number; goals_against: number; points: number; is_our_team: boolean; variant: string }[]}
      top5Scorers={top5Scorers}
      top5Appearances={top5Appearances}
      teams={teams}
    />
  );
}
