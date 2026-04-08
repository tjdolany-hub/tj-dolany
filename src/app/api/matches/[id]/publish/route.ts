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
      "*, match_lineups(player_id, is_starter, is_captain, number, players(name)), match_scorers(player_id, goals, minute, is_penalty, players(name)), match_cards(player_id, card_type, minute, players(name)), match_images(url, alt, sort_order), match_opponent_scorers(name, minute, is_penalty), match_opponent_cards(name, card_type, minute), match_opponent_lineup(name, number, position, is_starter, is_captain)"
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
    timeZone: "Europe/Prague",
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
  if (match.competition) content += ` **Soutěž:** ${match.competition}`;
  if (match.round) content += ` **Kolo:** ${match.round}`;
  if (match.venue) content += ` **Hřiště:** ${match.venue}`;

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
        (l: { players: { name: string } | null; is_captain?: boolean }) => {
          const name = l.players?.name || "?";
          return l.is_captain ? `${name} (K)` : name;
        }
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

  // Goals — group by player, show individual minutes + penalty
  if (match.match_scorers && match.match_scorers.length > 0) {
    const goalMap = new Map<string, { name: string; entries: { minute: number | null; is_penalty: boolean }[] }>();
    match.match_scorers.forEach(
      (s: { player_id: string; players: { name: string } | null; goals: number; minute: number | null; is_penalty?: boolean }) => {
        const existing = goalMap.get(s.player_id);
        if (existing) {
          existing.entries.push({ minute: s.minute, is_penalty: s.is_penalty ?? false });
        } else {
          goalMap.set(s.player_id, { name: s.players?.name || "?", entries: [{ minute: s.minute, is_penalty: s.is_penalty ?? false }] });
        }
      }
    );
    const goalTexts = [...goalMap.values()].map((g) => {
      let txt = g.name;
      if (g.entries.length > 1) txt += ` ${g.entries.length}×`;
      const sorted = g.entries.filter((e) => e.minute != null).sort((a, b) => a.minute! - b.minute!);
      if (sorted.length > 0) txt += ` (${sorted.map((e) => `${e.minute}'${e.is_penalty ? " PK" : ""}`).join(", ")})`;
      return txt;
    });
    content += `\n\n**Góly Dolany:** ${goalTexts.join(", ")}`;
  }

  // Opponent scorers — prefer structured data, fallback to free text
  const oppScorers = match.match_opponent_scorers as { name: string; minute: number | null; is_penalty: boolean }[] | null;
  if (oppScorers && oppScorers.length > 0) {
    const texts = oppScorers.map((s) => {
      let txt = s.name;
      if (s.is_penalty) txt += " (PK)";
      if (s.minute) txt += ` (${s.minute}')`;
      return txt;
    });
    content += `\n**Góly ${match.opponent}:** ${texts.join(", ")}`;
  } else if (match.opponent_scorers) {
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

  // Opponent cards — prefer structured data, fallback to free text
  const oppCards = match.match_opponent_cards as { name: string; card_type: string; minute: number | null }[] | null;
  if (oppCards && oppCards.length > 0) {
    const oppYellows = oppCards.filter((c) => c.card_type === "yellow");
    const oppReds = oppCards.filter((c) => c.card_type === "red");
    if (oppYellows.length > 0) {
      content += `\n**Žluté karty ${match.opponent}:** ${oppYellows.map((c) => { let txt = c.name; if (c.minute) txt += ` (${c.minute}')`; return txt; }).join(", ")}`;
    }
    if (oppReds.length > 0) {
      content += `\n**Červené karty ${match.opponent}:** ${oppReds.map((c) => { let txt = c.name; if (c.minute) txt += ` (${c.minute}')`; return txt; }).join(", ")}`;
    }
  } else if (match.opponent_cards) {
    content += `\n**Karty ${match.opponent}:** ${match.opponent_cards}`;
  }

  // Opponent lineup
  const oppLineup = match.match_opponent_lineup as { name: string; number: number | null; position: string | null; is_starter: boolean; is_captain?: boolean }[] | null;
  if (oppLineup && oppLineup.length > 0) {
    const oppStarters = oppLineup.filter((p) => p.is_starter);
    const oppSubs = oppLineup.filter((p) => !p.is_starter);
    if (oppStarters.length > 0) {
      content += `\n\n**Sestava ${match.opponent}:** ${oppStarters.map((p) => p.is_captain ? `${p.name} (K)` : p.name).join(", ")}`;
    }
    if (oppSubs.length > 0) {
      content += `\n**Náhradníci ${match.opponent}:** ${oppSubs.map((p) => p.name).join(", ")}`;
    }
  }

  // Match details footer
  const footerParts: string[] = [];
  if (match.referee) footerParts.push(`**Rozhodčí:** ${match.referee}`);
  if (match.delegate) footerParts.push(`**Delegát:** ${match.delegate}`);
  if (match.spectators != null) footerParts.push(`**Diváků:** ${match.spectators}`);
  if (footerParts.length > 0) {
    content += `\n\n${footerParts.join(" ")}`;
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
