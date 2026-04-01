import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import AktualityClient from "./AktualityClient";

export const revalidate = 60;

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
    .order("created_at", { ascending: false });

  return <AktualityClient articles={articles ?? []} />;
}
