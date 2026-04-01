import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  date: z.string().optional(),
  opponent: z.string().min(1).optional(),
  score_home: z.number().optional(),
  score_away: z.number().optional(),
  is_home: z.boolean().optional(),
  competition: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

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

  const admin = await createServiceClient();
  const { data: match, error } = await admin
    .from("match_results")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(match);
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
  await admin.from("match_results").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
