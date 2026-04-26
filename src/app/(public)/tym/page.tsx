import { createClient } from "@/lib/supabase/server";
import { getSeasonForDate } from "@/lib/stats";
import type { Metadata } from "next";
import TymClient from "./TymClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Tým a výsledky",
  description: "Soupiska týmu, výsledky zápasů a statistiky TJ Dolany.",
  openGraph: {
    title: "Tým a výsledky | TJ Dolany",
    description: "Soupiska týmu, výsledky zápasů a statistiky TJ Dolany.",
  },
};

export default async function TymPage() {
  const supabase = await createClient();

  const currentSeason = getSeasonForDate(new Date());

  const [
    { data: players }, { data: draws }, { data: matches },
    { data: matchScorersDetailed }, { data: matchCardsDetailed },
    { data: oppScorers }, { data: oppCards },
    { data: teamsData }, { data: leagueStandings },
    { data: allSeasonStats }, { data: currentSeasonStats },
    { data: trainingAtt },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("season_draws")
      .select("id, season, title, image, active, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("match_results")
      .select("*, articles(slug), match_images(url, alt, sort_order)")
      .is("deleted_at", null)
      .order("date", { ascending: true }),
    supabase.from("match_scorers").select("match_id, minute, is_penalty, players(name)"),
    supabase.from("match_cards").select("match_id, card_type, minute, players(name)"),
    supabase.from("match_opponent_scorers").select("match_id, name, minute, is_penalty"),
    supabase.from("match_opponent_cards").select("match_id, name, card_type, minute"),
    supabase.from("teams").select("keywords, logo_url").order("name"),
    supabase
      .from("league_standings")
      .select("id, season, variant, position, team_name, matches_played, wins, draws, losses, goals_for, goals_against, points, is_our_team")
      .eq("season", currentSeason)
      .order("position", { ascending: true }),
    // All seasons stats for the statistics tab
    supabase
      .from("player_season_stats")
      .select("player_id, season, half, matches, goals, yellows, reds"),
    // Current season stats for squad section
    supabase
      .from("player_season_stats")
      .select("player_id, matches, goals, yellows, reds")
      .eq("season", currentSeason),
    supabase
      .from("training_attendance")
      .select("player_id, response, trainings!inner(season)")
      .eq("trainings.season", currentSeason),
  ]);

  // Build playerStats for squad section from pre-aggregated current season data
  const playerStats: Record<string, { matches: number; goals: number; yellows: number; reds: number }> = {};
  for (const s of currentSeasonStats ?? []) {
    const existing = playerStats[s.player_id];
    if (existing) {
      existing.matches += s.matches;
      existing.goals += s.goals;
      existing.yellows += s.yellows;
      existing.reds += s.reds;
    } else {
      playerStats[s.player_id] = { matches: s.matches, goals: s.goals, yellows: s.yellows, reds: s.reds };
    }
  }

  // Convert pre-aggregated stats to the format TymClient expects
  type StatsEntryOut = { player_id: string; season: string; half: "podzim" | "jaro"; matches: number; goals: number; yellows: number; reds: number };
  const statsEntries: StatsEntryOut[] = (allSeasonStats ?? []).map((s) => ({
    player_id: s.player_id,
    season: s.season,
    half: s.half as "podzim" | "jaro",
    matches: s.matches,
    goals: s.goals,
    yellows: s.yellows,
    reds: s.reds,
  }));

  const availableSeasons = [...new Set(statsEntries.map((s) => s.season))].sort().reverse();

  // Build per-match event data for timeline display
  type MatchEvent = {
    type: "goal" | "yellow" | "red";
    minute: number | null;
    playerName: string;
    is_penalty: boolean;
    side: "home" | "away";
  };
  const matchEvents: Record<string, MatchEvent[]> = {};

  for (const s of (matchScorersDetailed ?? []) as { match_id: string; minute: number | null; is_penalty: boolean; players: { name: string } | null }[]) {
    if (!matchEvents[s.match_id]) matchEvents[s.match_id] = [];
    const m = (matches ?? []).find((x) => x.id === s.match_id);
    matchEvents[s.match_id].push({
      type: "goal",
      minute: s.minute,
      playerName: s.players?.name || "?",
      is_penalty: s.is_penalty ?? false,
      side: m?.is_home ? "home" : "away",
    });
  }

  for (const c of (matchCardsDetailed ?? []) as { match_id: string; card_type: string; minute: number | null; players: { name: string } | null }[]) {
    if (!matchEvents[c.match_id]) matchEvents[c.match_id] = [];
    const m = (matches ?? []).find((x) => x.id === c.match_id);
    matchEvents[c.match_id].push({
      type: c.card_type === "red" ? "red" : "yellow",
      minute: c.minute,
      playerName: c.players?.name || "?",
      is_penalty: false,
      side: m?.is_home ? "home" : "away",
    });
  }

  for (const s of (oppScorers ?? []) as { match_id: string; name: string; minute: number | null; is_penalty: boolean }[]) {
    if (!matchEvents[s.match_id]) matchEvents[s.match_id] = [];
    const m = (matches ?? []).find((x) => x.id === s.match_id);
    matchEvents[s.match_id].push({
      type: "goal",
      minute: s.minute,
      playerName: s.name,
      is_penalty: s.is_penalty ?? false,
      side: m?.is_home ? "away" : "home",
    });
  }

  for (const c of (oppCards ?? []) as { match_id: string; name: string; card_type: string; minute: number | null }[]) {
    if (!matchEvents[c.match_id]) matchEvents[c.match_id] = [];
    const m = (matches ?? []).find((x) => x.id === c.match_id);
    matchEvents[c.match_id].push({
      type: c.card_type === "red" ? "red" : "yellow",
      minute: c.minute,
      playerName: c.name,
      is_penalty: false,
      side: m?.is_home ? "away" : "home",
    });
  }

  // Training attendance
  const trainingStatsMap: Record<string, { jde: number; nejde: number; neodpovedel: number; total: number }> = {};
  for (const a of trainingAtt ?? []) {
    if (!trainingStatsMap[a.player_id]) {
      trainingStatsMap[a.player_id] = { jde: 0, nejde: 0, neodpovedel: 0, total: 0 };
    }
    trainingStatsMap[a.player_id].total++;
    if (a.response === "jde") trainingStatsMap[a.player_id].jde++;
    else if (a.response === "nejde") trainingStatsMap[a.player_id].nejde++;
    else trainingStatsMap[a.player_id].neodpovedel++;
  }

  const trainingLeaderboard = Object.entries(trainingStatsMap)
    .map(([player_id, stats]) => ({
      player_id,
      ...stats,
      rate: stats.total > 0 ? Math.round((stats.jde / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate || b.jde - a.jde);

  return (
    <TymClient
      players={players ?? []}
      draws={draws ?? []}
      matches={matches ?? []}
      playerStats={playerStats}
      standings={leagueStandings ?? []}
      statsEntries={statsEntries}
      availableSeasons={availableSeasons}
      matchEvents={matchEvents}
      trainingLeaderboard={trainingLeaderboard}
      teams={(teamsData ?? []) as { keywords: string[]; logo_url: string | null }[]}
    />
  );
}
