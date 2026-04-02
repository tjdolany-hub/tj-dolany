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
  summary_title: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  halftime_home: z.number().nullable().optional(),
  halftime_away: z.number().nullable().optional(),
  venue: z.string().nullable().optional(),
  lineup: z.array(z.object({ player_id: z.string(), is_starter: z.boolean().default(true) })).optional(),
  scorers: z.array(z.object({ player_id: z.string(), goals: z.number().default(1), minute: z.number().nullable().optional() })).optional(),
  cards: z.array(z.object({ player_id: z.string(), card_type: z.enum(["yellow", "red"]), minute: z.number().nullable().optional() })).optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string().nullable().optional() })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match, error } = await supabase
    .from("match_results")
    .select("*, match_lineups(player_id, is_starter, players(id, name)), match_scorers(player_id, goals, minute, players(id, name)), match_cards(player_id, card_type, minute, players(id, name)), match_images(url, alt, sort_order)")
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

  const { lineup, scorers, cards, images, ...data } = parsed.data;

  const admin = await createServiceClient();

  if (Object.keys(data).length > 0) {
    const { error } = await admin
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
      const lineupRows = lineup.map((l) => ({
        match_id: id,
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
  }

  if (scorers !== undefined) {
    await admin.from("match_scorers").delete().eq("match_id", id);
    if (scorers.length > 0) {
      const scorerRows = scorers.map((s) => ({
        match_id: id,
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
  }

  if (cards !== undefined) {
    await admin.from("match_cards").delete().eq("match_id", id);
    if (cards.length > 0) {
      const cardRows = cards.map((c) => ({
        match_id: id,
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
  }

  if (images !== undefined) {
    await admin.from("match_images").delete().eq("match_id", id);
    if (images.length > 0) {
      const imageRows = images.map((img, i) => ({
        match_id: id,
        url: img.url,
        alt: img.alt ?? null,
        sort_order: i,
      }));
      await admin.from("match_images").insert(imageRows);
    }
  }

  // Return updated match with relations
  const { data: updated } = await admin
    .from("match_results")
    .select("*, match_lineups(player_id, is_starter, players(id, name)), match_scorers(player_id, goals, minute, players(id, name)), match_cards(player_id, card_type, minute, players(id, name)), match_images(url, alt, sort_order)")
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
