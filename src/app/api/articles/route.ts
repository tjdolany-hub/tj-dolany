import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import type { Database } from "@/types/database";

const articleSchema = z.object({
  title: z.string().min(1, "Titulek je povinný"),
  content: z.string().min(1, "Obsah je povinný"),
  summary: z.string().optional(),
  category: z.enum(["aktuality", "fotbal", "sokolovna", "oznameni"]),
  published: z.boolean().default(false),
  created_at: z.string().optional(),
  images: z
    .array(z.object({ url: z.string(), alt: z.string().optional() }))
    .optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const all = searchParams.get("all") === "true";

  let query = supabase
    .from("articles")
    .select("*, article_images(*)", { count: "exact" });

  if (!all) {
    query = query.eq("published", true);
  }
  const validCategories = ["aktuality", "fotbal", "sokolovna", "oznameni"] as const;
  if (category && category !== "vse" && validCategories.includes(category as typeof validCategories[number])) {
    query = query.eq("category", category as typeof validCategories[number]);
  }

  const { data: articles, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const total = count ?? 0;

  return NextResponse.json({
    articles: articles ?? [],
    total,
    pages: Math.ceil(total / limit),
    page,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = articleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { images, created_at, ...data } = parsed.data;
  const slug = slugify(data.title);

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  const finalSlug = existing && existing.length > 0 ? `${slug}-${Date.now()}` : slug;

  const admin = await createServiceClient();
  const insertData: Database["public"]["Tables"]["articles"]["Insert"] = { ...data, slug: finalSlug, author_id: user.id };
  if (created_at) {
    insertData.created_at = new Date(`${created_at}T12:00:00`).toISOString();
  }
  const { data: article, error } = await admin
    .from("articles")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (images && images.length > 0 && article) {
    await admin.from("article_images").insert(
      images.map((img, i) => ({
        article_id: article.id,
        url: img.url,
        alt: img.alt || null,
        sort_order: i,
      }))
    );
  }

  return NextResponse.json(article, { status: 201 });
}
