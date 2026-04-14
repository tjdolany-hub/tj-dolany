import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  role: z.enum(["admin", "editor"]).optional(),
  name: z.string().trim().min(1).max(120).optional(),
});

async function countAdmins(admin: SupabaseClient<Database>) {
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAdmin();
  if (result.error) return result.error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { admin, user: actor } = result.ctx;

  const { data: target } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 });
  }

  // Block demotion of the last admin.
  if (
    parsed.data.role &&
    parsed.data.role !== "admin" &&
    target.role === "admin"
  ) {
    const adminCount = await countAdmins(admin);
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Nelze odebrat roli poslednímu administrátorovi" },
        { status: 400 },
      );
    }
  }

  const update: { role?: "admin" | "editor"; name?: string } = {};
  if (parsed.data.role) update.role = parsed.data.role;
  if (parsed.data.name) update.name = parsed.data.name;

  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(admin, {
    userId: actor.id,
    userEmail: actor.email ?? "",
    action: "update",
    entityType: "user",
    entityId: id,
    entityTitle: target.email,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAdmin();
  if (result.error) return result.error;

  const { admin, user: actor } = result.ctx;

  // Disallow self-delete to prevent locking yourself out mid-session.
  if (id === actor.id) {
    return NextResponse.json(
      { error: "Nelze smazat vlastní účet" },
      { status: 400 },
    );
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 });
  }

  if (target.role === "admin") {
    const adminCount = await countAdmins(admin);
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Nelze smazat posledního administrátora" },
        { status: 400 },
      );
    }
  }

  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Profile row is removed by the auth.users → profiles cascade if defined,
  // otherwise we delete it explicitly. Either way, ensure it's gone.
  await admin.from("profiles").delete().eq("id", id);

  await logAudit(admin, {
    userId: actor.id,
    userEmail: actor.email ?? "",
    action: "delete",
    entityType: "user",
    entityId: id,
    entityTitle: target.email,
  });

  return NextResponse.json({ success: true });
}
