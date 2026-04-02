import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import type { Database } from "@/types/database";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  category: z.enum(["aktuality", "fotbal", "sokolovna", "oznameni"]).optional(),
  published: z.boolean().optional(),
  created_at: z.string().optional(),
  images: z
    .array(z.object({ url: z.string(), alt: z.string().optional() }))
    .optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*, article_images(*)")
    .eq("id", id)
    .single();

  if (!article) {
    return NextResponse.json({ error: "Článek nenalezen" }, { status: 404 });
  }

  return NextResponse.json(article);
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

  const { images, created_at, ...data } = parsed.data;

  const updateData = { ...data } as Database["public"]["Tables"]["articles"]["Update"];
  if (data.title) {
    updateData.slug = slugify(data.title);
  }
  if (created_at) {
    updateData.created_at = new Date(`${created_at}T12:00:00`).toISOString();
  }

  const admin = await createServiceClient();

  if (images) {
    await admin.from("article_images").delete().eq("article_id", id);
    if (images.length > 0) {
      await admin.from("article_images").insert(
        images.map((img, i) => ({
          article_id: id,
          url: img.url,
          alt: img.alt || null,
          sort_order: i,
        }))
      );
    }
  }

  const { data: article, error } = await admin
    .from("articles")
    .update(updateData)
    .eq("id", id)
    .select("*, article_images(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(article);
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
  await admin.from("article_images").delete().eq("article_id", id);
  await admin.from("articles").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
