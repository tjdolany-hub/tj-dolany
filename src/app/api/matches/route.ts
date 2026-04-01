import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const matchSchema = z.object({
  date: z.string(),
  opponent: z.string().min(1, "Soupeř je povinný"),
  score_home: z.number().default(0),
  score_away: z.number().default(0),
  is_home: z.boolean().default(true),
  competition: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  lineup: z.array(z.string()).optional(),
  scorers: z.array(z.object({ player_id: z.string(), goals: z.number().default(1) })).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");

  let query = supabase
    .from("match_results")
    .select("*, match_lineups(player_id, players(id, name)), match_scorers(player_id, goals, players(id, name))")
    .order("date", { ascending: false });

  if (season) {
    query = query.eq("season", season);
  }

  const { data: matches } = await query;

  return NextResponse.json(matches ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { lineup, scorers, ...data } = parsed.data;

  const admin = await createServiceClient();
  const { data: match, error } = await admin
    .from("match_results")
    .insert(data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (lineup && lineup.length > 0) {
    const lineupRows = lineup.map((player_id) => ({
      match_id: match.id,
      player_id,
    }));
    const { error: lineupError } = await admin
      .from("match_lineups")
      .insert(lineupRows);
    if (lineupError) {
      return NextResponse.json({ error: lineupError.message }, { status: 500 });
    }
  }

  if (scorers && scorers.length > 0) {
    const scorerRows = scorers.map((s) => ({
      match_id: match.id,
      player_id: s.player_id,
      goals: s.goals,
    }));
    const { error: scorerError } = await admin
      .from("match_scorers")
      .insert(scorerRows);
    if (scorerError) {
      return NextResponse.json({ error: scorerError.message }, { status: 500 });
    }
  }

  return NextResponse.json(match, { status: 201 });
}
