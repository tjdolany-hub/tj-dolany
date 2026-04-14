import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAdmin();
  if (result.error) return result.error;

  const { admin, user: actor } = result.ctx;

  const { data: target } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Uživatel nenalezen" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tjdolany.net";

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: target.email,
    options: { redirectTo: `${siteUrl}/reset-password` },
  });

  if (linkError || !link.properties?.action_link) {
    return NextResponse.json(
      { error: linkError?.message ?? "Nepodařilo se vygenerovat odkaz" },
      { status: 500 },
    );
  }

  try {
    await sendPasswordResetEmail(target.email, link.properties.action_link);
  } catch (e) {
    console.error("Failed to send reset email", e);
    return NextResponse.json(
      { error: "Nepodařilo se odeslat e-mail" },
      { status: 500 },
    );
  }

  await logAudit(admin, {
    userId: actor.id,
    userEmail: actor.email ?? "",
    action: "reset_password",
    entityType: "user",
    entityId: id,
    entityTitle: target.email,
  });

  return NextResponse.json({ success: true });
}
