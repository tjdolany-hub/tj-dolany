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
  halftime_home: z.number().nullable().optional(),
  halftime_away: z.number().nullable().optional(),
  venue: z.string().nullable().optional(),
  lineup: z.array(z.object({ player_id: z.string(), is_starter: z.boolean().default(true) })).optional(),
  scorers: z.array(z.object({ player_id: z.string(), goals: z.number().default(1), minute: z.number().nullable().optional() })).optional(),
  cards: z.array(z.object({ player_id: z.string(), card_type: z.enum(["yellow", "red"]), minute: z.number().nullable().optional() })).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");

  let query = supabase
    .from("match_results")
    .select("*, match_lineups(player_id, is_starter, players(id, name)), match_scorers(player_id, goals, minute, players(id, name)), match_cards(player_id, card_type, minute, players(id, name))")
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

  const { lineup, scorers, cards, ...data } = parsed.data;

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
    const lineupRows = lineup.map((l) => ({
      match_id: match.id,
      player_id: l.player_id,
      is_starter: l.is_starter,
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
      minute: s.minute ?? null,
    }));
    const { error: scorerError } = await admin
      .from("match_scorers")
      .insert(scorerRows);
    if (scorerError) {
      return NextResponse.json({ error: scorerError.message }, { status: 500 });
    }
  }

  if (cards && cards.length > 0) {
    const cardRows = cards.map((c) => ({
      match_id: match.id,
      player_id: c.player_id,
      card_type: c.card_type,
      minute: c.minute ?? null,
    }));
    const { error: cardError } = await admin
      .from("match_cards")
      .insert(cardRows);
    if (cardError) {
      return NextResponse.json({ error: cardError.message }, { status: 500 });
    }
  }

  return NextResponse.json(match, { status: 201 });
}
