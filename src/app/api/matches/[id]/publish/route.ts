import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const published = body.published !== false; // default true
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const admin = await createServiceClient();

  // Fetch match with all relations
  const { data: match, error } = await admin
    .from("match_results")
    .select(
      "*, match_lineups(player_id, is_starter, players(name)), match_scorers(player_id, goals, minute, players(name)), match_cards(player_id, card_type, minute, players(name)), match_images(url, alt, sort_order)"
    )
    .eq("id", id)
    .single();

  if (error || !match) {
    return NextResponse.json({ error: "Zápas nenalezen" }, { status: 404 });
  }

  // Build article content
  const d = new Date(match.date);
  const dateStr = d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const home = match.is_home ? "TJ Dolany" : match.opponent;
  const away = match.is_home ? match.opponent : "TJ Dolany";
  const title = `${home} - ${away} ${match.score_home}:${match.score_away}`;
  const slug = slugify(`${title}-${d.toISOString().slice(0, 10)}`);

  let content = `## ${home} - ${away} ${match.score_home}:${match.score_away}`;
  if (match.halftime_home != null && match.halftime_away != null) {
    content += ` (${match.halftime_home}:${match.halftime_away})`;
  }
  content += `\n\n**Datum:** ${dateStr}`;
  if (match.competition) content += `\n**Soutěž:** ${match.competition}`;
  if (match.venue) content += `\n**Hřiště:** ${match.venue}`;

  // Lineup
  const starters =
    match.match_lineups?.filter(
      (l: { is_starter: boolean; players: { name: string } | null }) =>
        l.is_starter
    ) ?? [];
  const subs =
    match.match_lineups?.filter(
      (l: { is_starter: boolean; players: { name: string } | null }) =>
        !l.is_starter
    ) ?? [];

  if (starters.length > 0) {
    content += `\n\n**Základní sestava:** ${starters
      .map(
        (l: { players: { name: string } | null }) => l.players?.name || "?"
      )
      .join(", ")}`;
  }
  if (subs.length > 0) {
    content += `\n**Střídající:** ${subs
      .map(
        (l: { players: { name: string } | null }) => l.players?.name || "?"
      )
      .join(", ")}`;
  }

  // Goals — group by player, show individual minutes
  if (match.match_scorers && match.match_scorers.length > 0) {
    const goalMap = new Map<string, { name: string; minutes: (number | null)[] }>();
    match.match_scorers.forEach(
      (s: { player_id: string; players: { name: string } | null; goals: number; minute: number | null }) => {
        const existing = goalMap.get(s.player_id);
        if (existing) {
          existing.minutes.push(s.minute);
        } else {
          goalMap.set(s.player_id, { name: s.players?.name || "?", minutes: [s.minute] });
        }
      }
    );
    const goalTexts = [...goalMap.values()].map((g) => {
      let txt = g.name;
      if (g.minutes.length > 1) txt += ` ${g.minutes.length}×`;
      const mins = g.minutes.filter((m): m is number => m != null).sort((a, b) => a - b);
      if (mins.length > 0) txt += ` (${mins.map((m) => `${m}'`).join(", ")})`;
      return txt;
    });
    content += `\n\n**Góly Dolany:** ${goalTexts.join(", ")}`;
  }

  // Opponent scorers (free text)
  if (match.opponent_scorers) {
    content += `\n**Góly ${match.opponent}:** ${match.opponent_scorers}`;
  }

  // Cards
  const yellows =
    match.match_cards?.filter(
      (c: { card_type: string }) => c.card_type === "yellow"
    ) ?? [];
  const reds =
    match.match_cards?.filter(
      (c: { card_type: string }) => c.card_type === "red"
    ) ?? [];

  if (yellows.length > 0) {
    content += `\n**Žluté karty:** ${yellows
      .map(
        (c: { players: { name: string } | null; minute: number | null }) => {
          let txt = c.players?.name || "?";
          if (c.minute) txt += ` (${c.minute}')`;
          return txt;
        }
      )
      .join(", ")}`;
  }
  if (reds.length > 0) {
    content += `\n**Červené karty:** ${reds
      .map(
        (c: { players: { name: string } | null; minute: number | null }) => {
          let txt = c.players?.name || "?";
          if (c.minute) txt += ` (${c.minute}')`;
          return txt;
        }
      )
      .join(", ")}`;
  }

  // Opponent cards (free text)
  if (match.opponent_cards) {
    content += `\n**Karty ${match.opponent}:** ${match.opponent_cards}`;
  }

  // Summary/report
  if (match.summary) {
    content += `\n\n${match.summary}`;
  }

  // Video
  if (match.video_url) {
    content += `\n\n**Video:**\n${match.video_url}`;
  }

  // Helper: sync match images to article_images
  const syncImages = async (articleId: string) => {
    const matchImages = (match.match_images as { url: string; alt: string | null; sort_order: number }[] | null) ?? [];
    if (matchImages.length === 0) return;
    // Remove old article images, replace with match images
    await admin.from("article_images").delete().eq("article_id", articleId);
    const rows = matchImages
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((img: { url: string; alt: string | null }) => ({
        article_id: articleId,
        url: img.url,
        alt: img.alt,
      }));
    await admin.from("article_images").insert(rows);
  };

  // Create or update article
  if (match.article_id) {
    // Update existing
    const { error: updateErr } = await admin
      .from("articles")
      .update({ title, slug, content, summary: title, published })
      .eq("id", match.article_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    await syncImages(match.article_id);
    return NextResponse.json({ article_id: match.article_id, slug, title, updated: true });
  } else {
    // Create new
    const { data: article, error: insertErr } = await admin
      .from("articles")
      .insert({
        title,
        slug,
        content,
        summary: title,
        category: "fotbal",
        published,
        author_id: user.id,
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Link article to match
    await admin
      .from("match_results")
      .update({ article_id: article.id })
      .eq("id", id);

    await syncImages(article.id);

    return NextResponse.json({
      article_id: article.id,
      slug,
      title,
      updated: false,
    });
  }
}
