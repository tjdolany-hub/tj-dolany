import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PlayerDetailClient from "./PlayerDetailClient";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("name")
    .eq("id", id)
    .single();

  if (!player) return { title: "Hráč nenalezen" };

  return {
    title: `${player.name} | TJ Dolany`,
    description: `Statistiky hráče ${player.name}`,
  };
}

interface SeasonStats {
  season: string;
  matches: number;
  goals: number;
  yellows: number;
  reds: number;
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) notFound();

  // Get all matches this player participated in
  const { data: matchLineups } = await supabase
    .from("match_lineups")
    .select("match_id, is_starter")
    .eq("player_id", id);

  const matchIds = (matchLineups ?? []).map((l) => l.match_id);

  // Fetch match details, scorers, and cards for these matches
  const [{ data: matchResults }, { data: scorers }, { data: cards }] =
    await Promise.all([
      matchIds.length > 0
        ? supabase
            .from("match_results")
            .select("id, date, opponent, score_home, score_away, is_home, season, competition")
            .in("id", matchIds)
            .is("deleted_at", null)
            .order("date", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("match_scorers")
        .select("match_id, goals")
        .eq("player_id", id),
      supabase
        .from("match_cards")
        .select("match_id, card_type")
        .eq("player_id", id),
    ]);

  // Build per-match data
  const matchGoals: Record<string, number> = {};
  for (const s of scorers ?? []) {
    matchGoals[s.match_id] = (matchGoals[s.match_id] || 0) + s.goals;
  }
  const matchCards: Record<string, { yellows: number; reds: number }> = {};
  for (const c of cards ?? []) {
    if (!matchCards[c.match_id]) matchCards[c.match_id] = { yellows: 0, reds: 0 };
    if (c.card_type === "yellow") matchCards[c.match_id].yellows++;
    else matchCards[c.match_id].reds++;
  }

  const starterMap: Record<string, boolean> = {};
  for (const l of matchLineups ?? []) {
    starterMap[l.match_id] = l.is_starter;
  }

  // Compute per-season stats
  const seasonStatsMap: Record<string, SeasonStats> = {};
  for (const m of matchResults ?? []) {
    const d = new Date(m.date);
    const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
    const season = m.season || `${y}/${y + 1}`;
    if (!seasonStatsMap[season]) {
      seasonStatsMap[season] = { season, matches: 0, goals: 0, yellows: 0, reds: 0 };
    }
    seasonStatsMap[season].matches++;
    seasonStatsMap[season].goals += matchGoals[m.id] || 0;
    seasonStatsMap[season].yellows += matchCards[m.id]?.yellows || 0;
    seasonStatsMap[season].reds += matchCards[m.id]?.reds || 0;
  }

  const seasonStats = Object.values(seasonStatsMap).sort((a, b) =>
    b.season.localeCompare(a.season)
  );

  // Build match history
  const matchHistory = (matchResults ?? []).map((m) => ({
    id: m.id,
    date: m.date,
    opponent: m.opponent,
    score_home: m.score_home,
    score_away: m.score_away,
    is_home: m.is_home,
    season: m.season,
    competition: m.competition,
    goals: matchGoals[m.id] || 0,
    yellows: matchCards[m.id]?.yellows || 0,
    reds: matchCards[m.id]?.reds || 0,
    is_starter: starterMap[m.id] ?? true,
  }));

  // Totals
  const totals = {
    matches: matchHistory.length,
    goals: matchHistory.reduce((s, m) => s + m.goals, 0),
    yellows: matchHistory.reduce((s, m) => s + m.yellows, 0),
    reds: matchHistory.reduce((s, m) => s + m.reds, 0),
  };

  // Fetch training attendance stats
  const { data: trainingAttendance } = await supabase
    .from("training_attendance")
    .select("response, trainings!inner(season)")
    .eq("player_id", id);

  // Group training stats by season
  const trainingStatsMap: Record<string, { jde: number; nejde: number; neodpovedel: number; total: number }> = {};
  for (const a of trainingAttendance ?? []) {
    const trainingSeason = (a.trainings as unknown as { season: string | null })?.season || "Bez sezóny";
    if (!trainingStatsMap[trainingSeason]) {
      trainingStatsMap[trainingSeason] = { jde: 0, nejde: 0, neodpovedel: 0, total: 0 };
    }
    trainingStatsMap[trainingSeason].total++;
    if (a.response === "jde") trainingStatsMap[trainingSeason].jde++;
    else if (a.response === "nejde") trainingStatsMap[trainingSeason].nejde++;
    else trainingStatsMap[trainingSeason].neodpovedel++;
  }

  const trainingStats = Object.entries(trainingStatsMap).map(([season, stats]) => ({
    season,
    ...stats,
    rate: stats.total > 0 ? Math.round((stats.jde / stats.total) * 100) : 0,
  })).sort((a, b) => b.season.localeCompare(a.season));

  const trainingTotals = {
    jde: trainingStats.reduce((s, t) => s + t.jde, 0),
    nejde: trainingStats.reduce((s, t) => s + t.nejde, 0),
    neodpovedel: trainingStats.reduce((s, t) => s + t.neodpovedel, 0),
    total: trainingStats.reduce((s, t) => s + t.total, 0),
  };

  return (
    <PlayerDetailClient
      player={player}
      seasonStats={seasonStats}
      matchHistory={matchHistory}
      totals={totals}
      trainingStats={trainingStats}
      trainingTotals={trainingTotals}
    />
  );
}
