import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleDetail from "./ArticleDetail";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) return { title: "Článek nenalezen" };

  return {
    title: article.title,
    description: article.summary || undefined,
    openGraph: {
      title: `${article.title} | TJ Dolany`,
      description: article.summary || undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  return <ArticleDetail article={article} />;
}
