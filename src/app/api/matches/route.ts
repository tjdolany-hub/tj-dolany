import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const matchSchema = z.object({
  date: z.string(),
  opponent: z.string().min(1, "Soupeř je povinný"),
  score_home: z.number().default(0),
  score_away: z.number().default(0),
  is_home: z.boolean().default(true),
  competition: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  summary_title: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  halftime_home: z.number().nullable().optional(),
  halftime_away: z.number().nullable().optional(),
  venue: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  opponent_scorers: z.string().nullable().optional(),
  opponent_cards: z.string().nullable().optional(),
  round: z.string().nullable().optional(),
  referee: z.string().nullable().optional(),
  delegate: z.string().nullable().optional(),
  spectators: z.number().nullable().optional(),
  match_number: z.string().nullable().optional(),
  match_type: z.enum(["mistrovsky", "pratelsky"]).default("mistrovsky"),
  lineup: z.array(z.object({ player_id: z.string(), is_starter: z.boolean().default(true), is_captain: z.boolean().default(false), number: z.number().nullable().optional() })).optional(),
  scorers: z.array(z.object({ player_id: z.string(), goals: z.number().default(1), minute: z.number().nullable().optional(), is_penalty: z.boolean().default(false) })).optional(),
  cards: z.array(z.object({ player_id: z.string(), card_type: z.enum(["yellow", "red"]), minute: z.number().nullable().optional() })).optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string().nullable().optional() })).optional(),
  opponent_scorers_data: z.array(z.object({ name: z.string(), minute: z.number().nullable().optional(), is_penalty: z.boolean().default(false) })).optional(),
  opponent_cards_data: z.array(z.object({ name: z.string(), card_type: z.enum(["yellow", "red"]), minute: z.number().nullable().optional() })).optional(),
  opponent_lineup: z.array(z.object({ name: z.string(), number: z.number().nullable().optional(), position: z.string().nullable().optional(), is_starter: z.boolean().default(true), is_captain: z.boolean().default(false) })).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");

  let query = supabase
    .from("match_results")
    .select("*, match_lineups(player_id, is_starter, is_captain, number, players(id, name)), match_scorers(player_id, goals, minute, is_penalty, players(id, name)), match_cards(player_id, card_type, minute, players(id, name)), match_images(url, alt, sort_order), match_opponent_scorers(name, minute, is_penalty), match_opponent_cards(name, card_type, minute), match_opponent_lineup(name, number, position, is_starter, is_captain)")
    .is("deleted_at", null)
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

  const { lineup, scorers, cards, images, opponent_scorers_data, opponent_cards_data, opponent_lineup, ...data } = parsed.data;

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
      is_captain: l.is_captain,
      number: l.number ?? null,
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
      is_penalty: s.is_penalty,
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

  if (images && images.length > 0) {
    const imageRows = images.map((img, i) => ({
      match_id: match.id,
      url: img.url,
      alt: img.alt ?? null,
      sort_order: i,
    }));
    await admin.from("match_images").insert(imageRows);
  }

  if (opponent_scorers_data && opponent_scorers_data.length > 0) {
    await admin.from("match_opponent_scorers").insert(
      opponent_scorers_data.map((s) => ({
        match_id: match.id,
        name: s.name,
        minute: s.minute ?? null,
        is_penalty: s.is_penalty,
      }))
    );
  }

  if (opponent_cards_data && opponent_cards_data.length > 0) {
    await admin.from("match_opponent_cards").insert(
      opponent_cards_data.map((c) => ({
        match_id: match.id,
        name: c.name,
        card_type: c.card_type,
        minute: c.minute ?? null,
      }))
    );
  }

  if (opponent_lineup && opponent_lineup.length > 0) {
    await admin.from("match_opponent_lineup").insert(
      opponent_lineup.map((p) => ({
        match_id: match.id,
        name: p.name,
        number: p.number ?? null,
        position: p.position ?? null,
        is_starter: p.is_starter,
        is_captain: p.is_captain,
      }))
    );
  }

  if (match) {
    // Auto-assign match number if match has a result (score > 0 or lineup present)
    // and doesn't already have a match_number. Includes 0:0 results (detected by lineup).
    const hasResult = match.score_home > 0 || match.score_away > 0 || (lineup && lineup.length > 0);
    if (!match.match_number && hasResult) {
      const { data: maxRow } = await admin
        .from("match_results")
        .select("match_number")
        .not("match_number", "is", null)
        .is("deleted_at", null)
        .order("match_number", { ascending: false })
        .limit(1)
        .single();
      const currentMax = maxRow?.match_number ? parseInt(maxRow.match_number) : 2173;
      const nextNumber = (isNaN(currentMax) ? 2173 : currentMax) + 1;
      await admin
        .from("match_results")
        .update({ match_number: nextNumber.toString() })
        .eq("id", match.id);
      match.match_number = nextNumber.toString();
    }

    await logAudit(admin, { userId: user.id, userEmail: user.email ?? "", action: "create", entityType: "match", entityId: match.id, entityTitle: `${match.is_home ? "TJ Dolany" : match.opponent} vs ${match.is_home ? match.opponent : "TJ Dolany"}` });

    // Auto-create calendar event for home matches
    if (match.is_home) {
      await admin.from("calendar_events").insert({
        title: `Dolany - ${match.opponent}`,
        date: match.date,
        event_type: "zapas",
        location: "cely_areal",
        is_public: true,
        all_day: false,
        description: match.competition || null,
      });
    }
  }

  return NextResponse.json(match, { status: 201 });
}
