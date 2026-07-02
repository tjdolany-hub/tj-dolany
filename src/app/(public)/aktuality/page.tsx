import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import AktualityClient from "./AktualityClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Aktuality",
  description: "Novinky a aktuality z TJ Dolany.",
  openGraph: {
    title: "Aktuality | TJ Dolany",
    description: "Novinky a aktuality z TJ Dolany.",
  },
};

export default async function AktualityPage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, slug, summary, category, created_at, article_images(url, alt)")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    // Only the cover image is shown in the listing — fetch just the first one
    // per article instead of every image row (galleries/matches can have dozens).
    .order("sort_order", { referencedTable: "article_images", ascending: true })
    .limit(1, { referencedTable: "article_images" });

  return <AktualityClient articles={articles ?? []} />;
}
