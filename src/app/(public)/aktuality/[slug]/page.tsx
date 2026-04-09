import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleDetail from "./ArticleDetail";
import type { MatchData } from "./ArticleDetail";
import type { Database } from "@/types/database";

export const revalidate = 60;

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type ArticleImageRow = Database["public"]["Tables"]["article_images"]["Row"];

interface ArticleWithImages extends ArticleRow {
  article_images: ArticleImageRow[];
}

interface Props {
  params: Promise<{ slug: string }>;
}

async function getArticle(slug: string): Promise<ArticleWithImages | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*, article_images(id, url, alt, sort_order)")
    .eq("slug", slug)
    .eq("published", true)
    .limit(1);

  if (!data || data.length === 0) return null;
  return data[0] as unknown as ArticleWithImages;
}

async function getMatchData(articleId: string): Promise<MatchData | null> {
  const supabase = await createClient();

  // Find match linked to this article
  const { data: match } = await supabase
    .from("match_results")
    .select("id, date, opponent, score_home, score_away, is_home, competition, season, halftime_home, halftime_away, venue, video_url, opponent_scorers, opponent_cards, round, referee, delegate, spectators, match_number, match_type")
    .eq("article_id", articleId)
    .is("deleted_at", null)
    .single();

  if (!match) return null;

  // Fetch lineups, scorers, cards, opponent data in parallel
  const [{ data: lineups }, { data: scorers }, { data: cards }, { data: oppLineup }, { data: oppScorers }, { data: oppCards }] = await Promise.all([
    supabase
      .from("match_lineups")
      .select("player_id, is_starter, is_captain, number, players(name)")
      .eq("match_id", match.id),
    supabase
      .from("match_scorers")
      .select("player_id, goals, minute, is_penalty, players(name)")
      .eq("match_id", match.id)
      .order("minute", { ascending: true, nullsFirst: false }),
    supabase
      .from("match_cards")
      .select("player_id, card_type, minute, players(name)")
      .eq("match_id", match.id)
      .order("minute", { ascending: true, nullsFirst: false }),
    supabase
      .from("match_opponent_lineup")
      .select("name, number, position, is_starter, is_captain")
      .eq("match_id", match.id),
    supabase
      .from("match_opponent_scorers")
      .select("name, minute, is_penalty")
      .eq("match_id", match.id)
      .order("minute", { ascending: true, nullsFirst: false }),
    supabase
      .from("match_opponent_cards")
      .select("name, card_type, minute")
      .eq("match_id", match.id)
      .order("minute", { ascending: true, nullsFirst: false }),
  ]);

  return {
    ...match,
    lineups: (lineups ?? []).map((l) => ({
      playerName: (l.players as unknown as { name: string })?.name ?? "",
      is_starter: l.is_starter,
      is_captain: l.is_captain,
      number: l.number,
    })),
    scorers: (scorers ?? []).map((s) => ({
      playerName: (s.players as unknown as { name: string })?.name ?? "",
      goals: s.goals,
      minute: s.minute,
      is_penalty: s.is_penalty,
    })),
    cards: (cards ?? []).map((c) => ({
      playerName: (c.players as unknown as { name: string })?.name ?? "",
      card_type: c.card_type,
      minute: c.minute,
    })),
    opponentLineup: (oppLineup ?? []).map((p) => ({
      name: p.name,
      number: p.number,
      position: p.position,
      is_starter: p.is_starter,
      is_captain: p.is_captain,
    })),
    opponentScorers: (oppScorers ?? []).map((s) => ({
      name: s.name,
      minute: s.minute,
      is_penalty: s.is_penalty,
    })),
    opponentCards: (oppCards ?? []).map((c) => ({
      name: c.name,
      card_type: c.card_type,
      minute: c.minute,
    })),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) return { title: "Článek nenalezen" };

  const ogImage = article.article_images?.sort(
    (a: ArticleImageRow, b: ArticleImageRow) => a.sort_order - b.sort_order
  )[0]?.url;

  return {
    title: article.title,
    description: article.summary || undefined,
    openGraph: {
      title: `${article.title} | TJ Dolany`,
      description: article.summary || undefined,
      type: "article",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const matchData = await getMatchData(article.id);

  // Fetch teams for logo lookup
  const supabase2 = await createClient();
  const { data: teamsData } = await supabase2.from("teams").select("keywords, logo_url").order("name");
  const teams = (teamsData ?? []) as { keywords: string[]; logo_url: string | null }[];

  return <ArticleDetail article={article} matchData={matchData} teams={teams} />;
}
