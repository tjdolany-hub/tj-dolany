import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import TymClient from "./TymClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tým",
  description: "Kádr mužstva TJ Dolany a aktuální losy soutěže.",
  openGraph: {
    title: "Tým | TJ Dolany",
    description: "Kádr mužstva TJ Dolany a aktuální losy soutěže.",
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

  return (
    <TymClient
      players={players ?? []}
      draws={draws ?? []}
      matches={matches ?? []}
      playerStats={playerStats}
      standings={leagueStandings ?? []}
    />
  );
}
