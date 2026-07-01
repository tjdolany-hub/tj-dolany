import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://tjdolany.net";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: articles }, { data: players }] = await Promise.all([
    supabase
      .from("articles")
      .select("slug")
      .eq("published", true)
      .is("deleted_at", null),
    supabase.from("players").select("id").eq("active", true),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/tym`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/plan-akci`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/aktuality`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/o-klubu`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const articleRoutes: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
    url: `${BASE}/aktuality/${a.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const playerRoutes: MetadataRoute.Sitemap = (players ?? []).map((p) => ({
    url: `${BASE}/tym/${p.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...staticRoutes, ...articleRoutes, ...playerRoutes];
}
