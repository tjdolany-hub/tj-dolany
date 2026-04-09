import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  preferred_foot: z.string().nullable().optional(),
  position: z.enum(["brankar", "obrance", "zaloznik", "utocnik"]).optional(),
  number: z.number().nullable().optional(),
  photo: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  sort_order: z.number().optional(),
  active: z.boolean().optional(),
  aliases: z.array(z.string()).optional(),
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
  const { data: player, error } = await admin
    .from("players")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (player) {
    await logAudit(admin, { userId: user.id, userEmail: user.email ?? "", action: "update", entityType: "player", entityId: id, entityTitle: player.name });
  }

  return NextResponse.json(player);
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

  const { data: player } = await admin.from("players").select("name").eq("id", id).single();

  await admin.from("players").delete().eq("id", id);

  await logAudit(admin, { userId: user.id, userEmail: user.email ?? "", action: "delete", entityType: "player", entityId: id, entityTitle: player?.name ?? null });

  return NextResponse.json({ success: true });
}
