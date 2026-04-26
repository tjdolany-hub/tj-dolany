import { NextRequest, NextResponse } from "next/server";
import { revalidatePublicPages } from "@/lib/revalidate";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { recomputeSeasonStats, getSeasonForDate } from "@/lib/stats";
import { slugify } from "@/lib/utils";
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
  video_url: z.string().nullable().optional(),
  opponent_scorers: z.string().nullable().optional(),
  opponent_cards: z.string().nullable().optional(),
  round: z.string().nullable().optional(),
  referee: z.string().nullable().optional(),
  delegate: z.string().nullable().optional(),
  spectators: z.number().nullable().optional(),
  match_number: z.string().nullable().optional(),
  match_type: z.enum(["mistrovsky", "pratelsky"]).optional(),
  lineup: z.array(z.object({ player_id: z.string(), is_starter: z.boolean().default(true), is_captain: z.boolean().default(false), number: z.number().nullable().optional() })).optional(),
  scorers: z.array(z.object({ player_id: z.string(), goals: z.number().default(1), minute: z.number().nullable().optional(), is_penalty: z.boolean().default(false) })).optional(),
  cards: z.array(z.object({ player_id: z.string(), card_type: z.enum(["yellow", "red"]), minute: z.number().nullable().optional() })).optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string().nullable().optional() })).optional(),
  opponent_scorers_data: z.array(z.object({ name: z.string(), minute: z.number().nullable().optional(), is_penalty: z.boolean().default(false) })).optional(),
  opponent_cards_data: z.array(z.object({ name: z.string(), card_type: z.enum(["yellow", "red"]), minute: z.number().nullable().optional() })).optional(),
  opponent_lineup: z.array(z.object({ name: z.string(), number: z.number().nullable().optional(), position: z.string().nullable().optional(), is_starter: z.boolean().default(true), is_captain: z.boolean().default(false) })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match, error } = await supabase
    .from("match_results")
    .select("*, match_lineups(player_id, is_starter, is_captain, number, players(id, name)), match_scorers(player_id, goals, minute, is_penalty, players(id, name)), match_cards(player_id, card_type, minute, players(id, name)), match_images(url, alt, sort_order), match_opponent_scorers(name, minute, is_penalty), match_opponent_cards(name, card_type, minute), match_opponent_lineup(name, number, position, is_starter, is_captain)")
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

  const { lineup, scorers, cards, images, opponent_scorers_data, opponent_cards_data, opponent_lineup, ...data } = parsed.data;

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
  }

  if (scorers !== undefined) {
    await admin.from("match_scorers").delete().eq("match_id", id);
    if (scorers.length > 0) {
      const scorerRows = scorers.map((s) => ({
        match_id: id,
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

  if (opponent_scorers_data !== undefined) {
    await admin.from("match_opponent_scorers").delete().eq("match_id", id);
    if (opponent_scorers_data.length > 0) {
      await admin.from("match_opponent_scorers").insert(
        opponent_scorers_data.map((s) => ({ match_id: id, name: s.name, minute: s.minute ?? null, is_penalty: s.is_penalty }))
      );
    }
  }

  if (opponent_cards_data !== undefined) {
    await admin.from("match_opponent_cards").delete().eq("match_id", id);
    if (opponent_cards_data.length > 0) {
      await admin.from("match_opponent_cards").insert(
        opponent_cards_data.map((c) => ({ match_id: id, name: c.name, card_type: c.card_type, minute: c.minute ?? null }))
      );
    }
  }

  if (opponent_lineup !== undefined) {
    await admin.from("match_opponent_lineup").delete().eq("match_id", id);
    if (opponent_lineup.length > 0) {
      await admin.from("match_opponent_lineup").insert(
        opponent_lineup.map((p) => ({ match_id: id, name: p.name, number: p.number ?? null, position: p.position ?? null, is_starter: p.is_starter, is_captain: p.is_captain }))
      );
    }
  }

  // Return updated match with relations
  const { data: updated } = await admin
    .from("match_results")
    .select("*, match_lineups(player_id, is_starter, is_captain, number, players(id, name)), match_scorers(player_id, goals, minute, is_penalty, players(id, name)), match_cards(player_id, card_type, minute, players(id, name)), match_images(url, alt, sort_order), match_opponent_scorers(name, minute, is_penalty), match_opponent_cards(name, card_type, minute), match_opponent_lineup(name, number, position, is_starter, is_captain)")
    .eq("id", id)
    .single();

  if (updated) {
    // Auto-assign match number if match now has a result and doesn't have a number yet
    // Includes 0:0 results (detected by lineup presence)
    const hasLineup = updated.match_lineups && updated.match_lineups.length > 0;
    const hasResult = updated.score_home > 0 || updated.score_away > 0 || hasLineup;
    if (!updated.match_number && hasResult) {
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
        .eq("id", id);
      updated.match_number = nextNumber.toString();
    }

    await logAudit(admin, { userId: user.id, userEmail: user.email ?? "", action: "update", entityType: "match", entityId: id, entityTitle: `${updated.is_home ? "TJ Dolany" : updated.opponent} vs ${updated.is_home ? updated.opponent : "TJ Dolany"}` });

    // Auto-sync to linked article if it exists
    if (updated.article_id) {
      try {
        const d = new Date(updated.date);
        const dateStr = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" });
        const home = updated.is_home ? "TJ Dolany" : updated.opponent;
        const away = updated.is_home ? updated.opponent : "TJ Dolany";
        const title = `${home} - ${away} ${updated.score_home}:${updated.score_away}`;
        const slug = slugify(`${title}-${d.toISOString().slice(0, 10)}`);

        let content = `## ${home} - ${away} ${updated.score_home}:${updated.score_away}`;
        if (updated.halftime_home != null && updated.halftime_away != null) {
          content += ` (${updated.halftime_home}:${updated.halftime_away})`;
        }
        content += `\n\n**Datum:** ${dateStr}`;
        if (updated.competition) content += `\n**Soutěž:** ${updated.competition}`;
        if (updated.venue) content += `\n**Hřiště:** ${updated.venue}`;

        const starters = updated.match_lineups?.filter((l: { is_starter: boolean }) => l.is_starter) ?? [];
        const subs = updated.match_lineups?.filter((l: { is_starter: boolean }) => !l.is_starter) ?? [];
        if (starters.length > 0) {
          content += `\n\n**Základní sestava:** ${starters.map((l: { players: { name: string } | null }) => l.players?.name || "?").join(", ")}`;
        }
        if (subs.length > 0) {
          content += `\n**Střídající:** ${subs.map((l: { players: { name: string } | null }) => l.players?.name || "?").join(", ")}`;
        }

        if (updated.match_scorers && updated.match_scorers.length > 0) {
          const goalMap = new Map<string, { name: string; minutes: (number | null)[] }>();
          updated.match_scorers.forEach((s: { player_id: string; players: { name: string } | null; goals: number; minute: number | null }) => {
            const existing = goalMap.get(s.player_id);
            if (existing) { existing.minutes.push(s.minute); }
            else { goalMap.set(s.player_id, { name: s.players?.name || "?", minutes: [s.minute] }); }
          });
          const goalTexts = [...goalMap.values()].map((g) => {
            let txt = g.name;
            if (g.minutes.length > 1) txt += ` ${g.minutes.length}×`;
            const mins = g.minutes.filter((m): m is number => m != null).sort((a, b) => a - b);
            if (mins.length > 0) txt += ` (${mins.map((m) => `${m}'`).join(", ")})`;
            return txt;
          });
          content += `\n\n**Góly Dolany:** ${goalTexts.join(", ")}`;
        }
        if (updated.opponent_scorers) content += `\n**Góly ${updated.opponent}:** ${updated.opponent_scorers}`;

        const yellows = updated.match_cards?.filter((c: { card_type: string }) => c.card_type === "yellow") ?? [];
        const reds = updated.match_cards?.filter((c: { card_type: string }) => c.card_type === "red") ?? [];
        if (yellows.length > 0) {
          content += `\n**Žluté karty:** ${yellows.map((c: { players: { name: string } | null; minute: number | null }) => { let txt = c.players?.name || "?"; if (c.minute) txt += ` (${c.minute}')`; return txt; }).join(", ")}`;
        }
        if (reds.length > 0) {
          content += `\n**Červené karty:** ${reds.map((c: { players: { name: string } | null; minute: number | null }) => { let txt = c.players?.name || "?"; if (c.minute) txt += ` (${c.minute}')`; return txt; }).join(", ")}`;
        }
        if (updated.opponent_cards) content += `\n**Karty ${updated.opponent}:** ${updated.opponent_cards}`;
        if (updated.summary) content += `\n\n${updated.summary}`;
        if (updated.video_url) content += `\n\n**Video:**\n${updated.video_url}`;

        await admin.from("articles").update({ title, slug, content, summary: title }).eq("id", updated.article_id);

        // Sync images
        const matchImages = (updated.match_images as { url: string; alt: string | null; sort_order: number }[] | null) ?? [];
        await admin.from("article_images").delete().eq("article_id", updated.article_id);
        if (matchImages.length > 0) {
          const articleId = updated.article_id as string;
          const rows = matchImages
            .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
            .map((img: { url: string; alt: string | null }) => ({ article_id: articleId, url: img.url, alt: img.alt }));
          await admin.from("article_images").insert(rows);
        }
      } catch {
        // Article sync failure should not break match save
      }
    }
  }

  if (updated) {
    const season = getSeasonForDate(new Date(updated.date), updated.season);
    recomputeSeasonStats(admin, season).catch(() => {});
  }

  revalidatePublicPages();
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

  const { data: match } = await admin.from("match_results").select("opponent, is_home, date, season").eq("id", id).single();

  await admin.from("match_results").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (match) {
    const season = getSeasonForDate(new Date(match.date), match.season);
    recomputeSeasonStats(admin, season).catch(() => {});
  }

  const title = match ? `${match.is_home ? "TJ Dolany" : match.opponent} vs ${match.is_home ? match.opponent : "TJ Dolany"}` : null;
  await logAudit(admin, { userId: user.id, userEmail: user.email ?? "", action: "delete", entityType: "match", entityId: id, entityTitle: title });

  revalidatePublicPages();
  return NextResponse.json({ success: true });
}
