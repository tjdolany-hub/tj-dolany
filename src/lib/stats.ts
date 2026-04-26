import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function recomputeSeasonStats(
  admin: SupabaseClient<Database>,
  season: string,
) {
  const { data: matches } = await admin
    .from("match_results")
    .select("id, date")
    .eq("season", season)
    .is("deleted_at", null);

  if (!matches || matches.length === 0) {
    await admin.from("player_season_stats").delete().eq("season", season);
    return;
  }

  const matchHalves: Record<string, "podzim" | "jaro"> = {};
  for (const m of matches) {
    const month = new Date(m.date).getMonth();
    matchHalves[m.id] = month >= 7 ? "podzim" : "jaro";
  }
  const matchIds = matches.map((m) => m.id);

  const [{ data: lineups }, { data: scorers }, { data: cards }] =
    await Promise.all([
      admin
        .from("match_lineups")
        .select("player_id, match_id")
        .in("match_id", matchIds),
      admin
        .from("match_scorers")
        .select("player_id, goals, match_id")
        .in("match_id", matchIds),
      admin
        .from("match_cards")
        .select("player_id, card_type, match_id")
        .in("match_id", matchIds),
    ]);

  type Key = `${string}|${string}`;
  const statsMap = new Map<
    Key,
    { player_id: string; season: string; half: "podzim" | "jaro"; matches: number; goals: number; yellows: number; reds: number }
  >();

  function getOrCreate(playerId: string, half: "podzim" | "jaro") {
    const key: Key = `${playerId}|${half}`;
    if (!statsMap.has(key)) {
      statsMap.set(key, { player_id: playerId, season, half, matches: 0, goals: 0, yellows: 0, reds: 0 });
    }
    return statsMap.get(key)!;
  }

  for (const l of lineups ?? []) {
    const half = matchHalves[l.match_id];
    if (!half) continue;
    getOrCreate(l.player_id, half).matches++;
  }

  for (const s of scorers ?? []) {
    const half = matchHalves[s.match_id];
    if (!half) continue;
    getOrCreate(s.player_id, half).goals += s.goals;
  }

  for (const c of cards ?? []) {
    const half = matchHalves[c.match_id];
    if (!half) continue;
    const entry = getOrCreate(c.player_id, half);
    if (c.card_type === "yellow") entry.yellows++;
    else entry.reds++;
  }

  await admin.from("player_season_stats").delete().eq("season", season);

  const rows = [...statsMap.values()];
  if (rows.length > 0) {
    await admin.from("player_season_stats").insert(rows);
  }
}

export async function recomputeAllSeasons(admin: SupabaseClient<Database>) {
  const { data: matches } = await admin
    .from("match_results")
    .select("date, season")
    .is("deleted_at", null);

  const seasons = new Set<string>();
  for (const m of matches ?? []) {
    seasons.add(getSeasonForDate(new Date(m.date), m.season));
  }

  for (const season of seasons) {
    await recomputeSeasonStats(admin, season);
  }

  return [...seasons];
}

export function getSeasonForDate(date: Date, explicitSeason?: string | null): string {
  if (explicitSeason) return explicitSeason;
  const y = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${y}/${y + 1}`;
}
