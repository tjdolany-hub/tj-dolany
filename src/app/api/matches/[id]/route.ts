import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  date: z.string().optional(),
  opponent: z.string().min(1).optional(),
  score_home: z.number().optional(),
  score_away: z.number().optional(),
  is_home: z.boolean().optional(),
  competition: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  lineup: z.array(z.string()).optional(),
  scorers: z.array(z.object({ player_id: z.string(), goals: z.number().default(1) })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match, error } = await supabase
    .from("match_results")
    .select("*, match_lineups(player_id, players(id, name)), match_scorers(player_id, goals, players(id, name))")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Zápas nenalezen" }, { status: 404 });
  }

  return NextResponse.json(match);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { lineup, scorers, ...data } = parsed.data;

  const admin = await createServiceClient();

  if (Object.keys(data).length > 0) {
    const { data: match, error } = await admin
      .from("match_results")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (lineup !== undefined) {
    await admin.from("match_lineups").delete().eq("match_id", id);
    if (lineup.length > 0) {
      const lineupRows = lineup.map((player_id) => ({
        match_id: id,
        player_id,
      }));
      const { error: lineupError } = await admin
        .from("match_lineups")
        .insert(lineupRows);
      if (lineupError) {
        return NextResponse.json({ error: lineupError.message }, { status: 500 });
      }
    }
  }

  if (scorers !== undefined) {
    await admin.from("match_scorers").delete().eq("match_id", id);
    if (scorers.length > 0) {
      const scorerRows = scorers.map((s) => ({
        match_id: id,
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
  }

  // Return updated match with relations
  const { data: updated } = await admin
    .from("match_results")
    .select("*, match_lineups(player_id, players(id, name)), match_scorers(player_id, goals, players(id, name))")
    .eq("id", id)
    .single();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const admin = await createServiceClient();
  await admin.from("match_results").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
