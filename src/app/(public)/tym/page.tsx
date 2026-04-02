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

  const [{ data: players }, { data: draws }, { data: matches }, { data: lineups }, { data: scorers }, { data: cards }] =
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
        .select("*, articles(slug)")
        .order("date", { ascending: true }),
      supabase.from("match_lineups").select("player_id, match_id"),
      supabase.from("match_scorers").select("player_id, goals, match_id"),
      supabase.from("match_cards").select("player_id, card_type, match_id"),
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

  return (
    <TymClient
      players={players ?? []}
      draws={draws ?? []}
      matches={matches ?? []}
      playerStats={playerStats}
      standings={leagueStandings ?? []}
      statsEntries={statsEntries}
      availableSeasons={availableSeasons}
    />
  );
}
