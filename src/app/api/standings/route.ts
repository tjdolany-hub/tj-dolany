import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const variantEnum = z.enum(["celkem", "doma", "venku"]);

const standingSchema = z.object({
  season: z.string(),
  variant: variantEnum.default("celkem"),
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
  variant: variantEnum.default("celkem"),
  standings: z.array(standingSchema),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const season = req.nextUrl.searchParams.get("season") || "2025/2026";
  const variant = req.nextUrl.searchParams.get("variant");

  let query = supabase
    .from("league_standings")
    .select("*")
    .eq("season", season);

  if (variant && ["celkem", "doma", "venku"].includes(variant)) {
    query = query.eq("variant", variant as "celkem" | "doma" | "venku");
  }

  const { data } = await query.order("position", { ascending: true });

  return NextResponse.json(data ?? []);
}

// Bulk replace standings for a season+variant
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const body = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { season, variant, standings } = parsed.data;
  const admin = await createServiceClient();

  // Delete existing standings for this season+variant
  await admin.from("league_standings").delete().eq("season", season).eq("variant", variant);

  // Insert new standings
  if (standings.length > 0) {
    const { error } = await admin.from("league_standings").insert(
      standings.map((s) => ({
        season,
        variant,
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
