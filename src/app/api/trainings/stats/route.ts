import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: training attendance stats per player, optionally filtered by season
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const playerId = searchParams.get("player_id");

  // If specific player requested
  if (playerId) {
    let query = supabase
      .from("training_attendance")
      .select("response, trainings!inner(id, date, title, type, season)")
      .eq("player_id", playerId);

    if (season) {
      query = query.eq("trainings.season", season);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = {
      total: data?.length ?? 0,
      jde: data?.filter((d) => d.response === "jde").length ?? 0,
      nejde: data?.filter((d) => d.response === "nejde").length ?? 0,
      neodpovedel: data?.filter((d) => d.response === "neodpovedel").length ?? 0,
      details: data ?? [],
    };

    return NextResponse.json(stats);
  }

  // All players stats
  let trainingQuery = supabase
    .from("trainings")
    .select("id, season");

  if (season) {
    trainingQuery = trainingQuery.eq("season", season);
  }

  const { data: trainings } = await trainingQuery;
  const trainingIds = (trainings ?? []).map((t) => t.id);

  if (trainingIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: attendance } = await supabase
    .from("training_attendance")
    .select("player_id, response, training_id")
    .in("training_id", trainingIds);

  // Group by player
  const playerStats = new Map<string, { jde: number; nejde: number; neodpovedel: number; total: number }>();

  for (const a of attendance ?? []) {
    const existing = playerStats.get(a.player_id) ?? { jde: 0, nejde: 0, neodpovedel: 0, total: 0 };
    existing.total++;
    if (a.response === "jde") existing.jde++;
    else if (a.response === "nejde") existing.nejde++;
    else existing.neodpovedel++;
    playerStats.set(a.player_id, existing);
  }

  const result = [...playerStats.entries()].map(([player_id, stats]) => ({
    player_id,
    ...stats,
    attendance_rate: stats.total > 0 ? Math.round((stats.jde / stats.total) * 100) : 0,
  }));

  // Sort by attendance rate descending
  result.sort((a, b) => b.attendance_rate - a.attendance_rate || b.jde - a.jde);

  return NextResponse.json(result);
}
