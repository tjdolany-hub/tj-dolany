import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import TymClient from "./TymClient";

export const revalidate = 60;

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

  // Determine current season
  const now = new Date();
  const currentSeasonYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const currentSeason = `${currentSeasonYear}/${currentSeasonYear + 1}`;

  const [{ data: players }, { data: draws }, { data: matches }, { data: lineups }, { data: scorers }, { data: cards }, { data: matchScorersDetailed }, { data: matchCardsDetailed }, { data: oppScorers }, { data: oppCards }, { data: teamsData }] =
    await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("season_draws")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("match_results")
        .select("*, articles(slug), match_images(url, alt, sort_order)")
        .order("date", { ascending: true }),
      supabase.from("match_lineups").select("player_id, match_id"),
      supabase.from("match_scorers").select("player_id, goals, match_id"),
      supabase.from("match_cards").select("player_id, card_type, match_id"),
      // Detailed scorers for timeline (with minute, penalty, player name)
      supabase.from("match_scorers").select("match_id, minute, is_penalty, players(name)"),
      supabase.from("match_cards").select("match_id, card_type, minute, players(name)"),
      supabase.from("match_opponent_scorers").select("match_id, name, minute, is_penalty"),
      supabase.from("match_opponent_cards").select("match_id, name, card_type, minute"),
      supabase.from("teams").select("keywords, logo_url").order("name"),
    ]);

  // Build match_id -> season lookup
  const matchSeasons: Record<string, string> = {};
  for (const m of matches ?? []) {
    const d = new Date(m.date);
    const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
    matchSeasons[m.id] = m.season || `${y}/${y + 1}`;
  }

  // Compute player stats for current season only
  const playerStats: Record<string, { matches: number; goals: number; yellows: number; reds: number }> = {};

  for (const l of lineups ?? []) {
    if (matchSeasons[l.match_id] !== currentSeason) continue;
    if (!playerStats[l.player_id]) playerStats[l.player_id] = { matches: 0, goals: 0, yellows: 0, reds: 0 };
    playerStats[l.player_id].matches++;
  }
  for (const s of scorers ?? []) {
    if (matchSeasons[s.match_id] !== currentSeason) continue;
    if (!playerStats[s.player_id]) playerStats[s.player_id] = { matches: 0, goals: 0, yellows: 0, reds: 0 };
    playerStats[s.player_id].goals += s.goals;
  }
  for (const c of cards ?? []) {
    if (matchSeasons[c.match_id] !== currentSeason) continue;
    if (!playerStats[c.player_id]) playerStats[c.player_id] = { matches: 0, goals: 0, yellows: 0, reds: 0 };
    if (c.card_type === "yellow") playerStats[c.player_id].yellows++;
    else playerStats[c.player_id].reds++;
  }

  // League standings
  const { data: leagueStandings } = await supabase
    .from("league_standings")
    .select("*")
    .eq("season", currentSeason)
    .order("position", { ascending: true });

  // Build all-time stats by season+half for the statistics tab
  type StatRow = { player_id: string; match_id: string };
  type ScorerRow = StatRow & { goals: number };
  type CardRow = StatRow & { card_type: string };

  // Attach season + half to each match
  const matchMeta: Record<string, { season: string; half: "podzim" | "jaro" }> = {};
  for (const m of matches ?? []) {
    const d = new Date(m.date);
    const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
    const season = m.season || `${y}/${y + 1}`;
    const half = d.getMonth() >= 7 ? "podzim" as const : "jaro" as const;
    matchMeta[m.id] = { season, half };
  }

  // Build serializable stats entries
  type StatsEntryOut = { player_id: string; season: string; half: "podzim" | "jaro"; type: "lineup" | "goal" | "card"; goals: number; card_type: string | null };
  const statsEntries: StatsEntryOut[] = (lineups ?? []).map((l: StatRow) => ({
    player_id: l.player_id,
    season: matchMeta[l.match_id]?.season || "",
    half: matchMeta[l.match_id]?.half || ("podzim" as const),
    type: "lineup" as const,
    goals: 0,
    card_type: null,
  }));

  for (const s of (scorers ?? []) as ScorerRow[]) {
    statsEntries.push({
      player_id: s.player_id,
      season: matchMeta[s.match_id]?.season || "",
      half: matchMeta[s.match_id]?.half || "podzim",
      type: "goal" as const,
      goals: s.goals,
      card_type: null,
    });
  }

  for (const c of (cards ?? []) as CardRow[]) {
    statsEntries.push({
      player_id: c.player_id,
      season: matchMeta[c.match_id]?.season || "",
      half: matchMeta[c.match_id]?.half || "podzim",
      type: "card" as const,
      goals: 0,
      card_type: c.card_type,
    });
  }

  // Available seasons
  const availableSeasons = [...new Set(Object.values(matchMeta).map((m) => m.season))].sort().reverse();

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
    // Determine side: Dolany scorers are always "our" team
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

  // Fetch training attendance stats for current season
  const { data: trainingAtt } = await supabase
    .from("training_attendance")
    .select("player_id, response, trainings!inner(season)")
    .eq("trainings.season", currentSeason);

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
