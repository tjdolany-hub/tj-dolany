import { NextRequest, NextResponse } from "next/server";
import { revalidatePublicPages } from "@/lib/revalidate";
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

  // Check if linked article still exists (may have been deleted)
  let existingArticleId: string | null = match.article_id;
  if (existingArticleId) {
    const { data: existing } = await admin
      .from("articles")
      .select("id")
      .eq("id", existingArticleId)
      .is("deleted_at", null)
      .single();
    if (!existing) {
      await admin.from("match_results").update({ article_id: null }).eq("id", id);
      existingArticleId = null;
    }
  }

  // Build article content
  const d = new Date(match.date);
  const home = match.is_home ? "TJ Dolany" : match.opponent;
  const away = match.is_home ? match.opponent : "TJ Dolany";
  const scoreTitle = `${home} - ${away} ${match.score_home}:${match.score_away}`;
  // Use summary_title if available, otherwise fall back to score title
  const title = match.summary_title || scoreTitle;
  const baseSlug = slugify(`${scoreTitle}-${d.toISOString().slice(0, 10)}`);
  // Deduplicate slug: check if another article (not ours) already uses it
  const { data: slugCheck } = await admin
    .from("articles")
    .select("id")
    .eq("slug", baseSlug)
    .is("deleted_at", null)
    .neq("id", existingArticleId ?? "00000000-0000-0000-0000-000000000000")
    .limit(1);
  const slug = slugCheck && slugCheck.length > 0 ? `${baseSlug}-${Date.now()}` : baseSlug;

  // Build article markdown: heading, report, sestava, branky, karty
  const contentParts: string[] = [];

  // 1. Title as heading
  contentParts.push(`## ${title}`);

  // 2. Summary/report text
  if (match.summary) {
    contentParts.push(match.summary);
  }

  // 3. Sestava (lineup)
  const lineups = (match.match_lineups as { is_starter: boolean; players: { name: string } }[] | null) ?? [];
  if (lineups.length > 0) {
    const starters = lineups.filter((l) => l.is_starter).map((l) => l.players.name);
    const subs = lineups.filter((l) => !l.is_starter).map((l) => l.players.name);
    let lineupStr = `**Sestava:** ${starters.join(", ")}`;
    if (subs.length > 0) {
      lineupStr += `. **Střídající:** ${subs.join(", ")}`;
    }
    contentParts.push(lineupStr);
  }

  // 4. Branky — aggregate per player, sort by count desc, format "2x Name"
  const dolanyScorers = (match.match_scorers as { goals: number; is_penalty: boolean; players: { name: string } }[] | null) ?? [];
  const oppScorers = (match.match_opponent_scorers as { name: string; is_penalty: boolean }[] | null) ?? [];
  if (dolanyScorers.length > 0 || oppScorers.length > 0) {
    // Aggregate Dolany goals per player
    const dolanyMap = new Map<string, number>();
    for (const s of dolanyScorers) {
      dolanyMap.set(s.players.name, (dolanyMap.get(s.players.name) || 0) + s.goals);
    }
    const dolanyNames = [...dolanyMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => count > 1 ? `${count}x ${name}` : name);

    // Aggregate opponent goals per player
    const oppMap = new Map<string, number>();
    for (const s of oppScorers) {
      oppMap.set(s.name, (oppMap.get(s.name) || 0) + 1);
    }
    const oppNames = [...oppMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => count > 1 ? `${count}x ${name}` : name);

    const goalParts = [dolanyNames.join(", "), oppNames.join(", ")].filter(Boolean);
    contentParts.push(`**Branky:** ${goalParts.join(" - ")}`);
  }

  // 5. Karty (ŽK X:Y, ČK X:Y)
  const dolanyCards = (match.match_cards as { card_type: string }[] | null) ?? [];
  const oppCards = (match.match_opponent_cards as { card_type: string }[] | null) ?? [];
  const dolanyYellow = dolanyCards.filter((c) => c.card_type === "yellow").length;
  const dolanyRed = dolanyCards.filter((c) => c.card_type === "red").length;
  const oppYellow = oppCards.filter((c) => c.card_type === "yellow").length;
  const oppRed = oppCards.filter((c) => c.card_type === "red").length;
  contentParts.push(`**Karty:** ŽK ${dolanyYellow}:${oppYellow}, ČK ${dolanyRed}:${oppRed}`);

  if (match.video_url) {
    contentParts.push(match.video_url);
  }

  const content = contentParts.join("\n\n");

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
  if (existingArticleId) {
    // Update existing
    const { error: updateErr } = await admin
      .from("articles")
      .update({ title, slug, content, summary: title, published })
      .eq("id", existingArticleId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    await syncImages(existingArticleId);
    revalidatePublicPages();
    return NextResponse.json({ article_id: existingArticleId, slug, title, updated: true });
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

    revalidatePublicPages();
    return NextResponse.json({
      article_id: article.id,
      slug,
      title,
      updated: false,
    });
  }
}
