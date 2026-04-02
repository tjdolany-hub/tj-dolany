import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const standingSchema = z.object({
  season: z.string(),
  position: z.number(),
  team_name: z.string().min(1),
  matches_played: z.number().default(0),
  wins: z.number().default(0),
  draws: z.number().default(0),
  losses: z.number().default(0),
  goals_for: z.number().default(0),
  goals_against: z.number().default(0),
  points: z.number().default(0),
  is_our_team: z.boolean().default(false),
});

const bulkSchema = z.object({
  season: z.string(),
  standings: z.array(standingSchema),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const season = req.nextUrl.searchParams.get("season") || "2025/2026";

  const { data } = await supabase
    .from("league_standings")
    .select("*")
    .eq("season", season)
    .order("position", { ascending: true });

  return NextResponse.json(data ?? []);
}

// Bulk replace all standings for a season
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const body = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await createServiceClient();

  // Delete existing standings for this season
  await admin.from("league_standings").delete().eq("season", parsed.data.season);

  // Insert new standings
  if (parsed.data.standings.length > 0) {
    const { error } = await admin.from("league_standings").insert(
      parsed.data.standings.map((s) => ({
        season: parsed.data.season,
        position: s.position,
        team_name: s.team_name,
        matches_played: s.matches_played,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goals_for: s.goals_for,
        goals_against: s.goals_against,
        points: s.points,
        is_our_team: s.is_our_team,
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
