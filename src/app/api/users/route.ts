import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendUserInviteEmail } from "@/lib/email";

export async function GET() {
  const result = await getSession();
  if (result.error) return result.error;

  const { data: profiles } = await result.ctx.admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json(profiles ?? []);
}

const createSchema = z.object({
  email: z.string().email("Neplatný e-mail").max(254),
  name: z.string().trim().min(1, "Jméno je povinné").max(120),
  role: z.enum(["admin", "editor"]),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(128),
  sendEmail: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const result = await requireAdmin();
  if (result.error) return result.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { email, name, role, password, sendEmail } = parsed.data;
  const { admin, user: actor } = result.ctx;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created.user) {
    const msg = createError?.message ?? "Nepodařilo se vytvořit uživatele";
    const status = msg.toLowerCase().includes("already") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  const newUserId = created.user.id;

  // Upsert profile — a DB trigger may have already inserted a default row.
  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      { id: newUserId, email, name, role },
      { onConflict: "id" },
    );

  if (profileError) {
    // Roll back the auth user to keep state consistent.
    await admin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await logAudit(admin, {
    userId: actor.id,
    userEmail: actor.email ?? "",
    action: "create",
    entityType: "user",
    entityId: newUserId,
    entityTitle: email,
  });

  if (sendEmail) {
    try {
      await sendUserInviteEmail(email, name, role, password);
    } catch (e) {
      console.error("Failed to send invite email", e);
      return NextResponse.json({
        success: true,
        id: newUserId,
        warning: "Uživatel vytvořen, ale nepodařilo se odeslat e-mail s pozvánkou.",
      });
    }
  }

  return NextResponse.json({ success: true, id: newUserId });
}
