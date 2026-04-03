import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  event_type: z.enum(["zapas", "trenink", "akce", "pronajem", "volne"]).optional(),
  location: z.string().nullable().optional(),
  organizer: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
  all_day: z.boolean().optional(),
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
  const { data: event, error } = await admin
    .from("calendar_events")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (event) {
    await logAudit(admin, { userId: user.id, userEmail: user.email ?? "", action: "update", entityType: "calendar_event", entityId: id, entityTitle: event.title });
  }

  return NextResponse.json(event);
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

  const { data: event } = await admin.from("calendar_events").select("title").eq("id", id).single();

  await admin.from("calendar_events").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  await logAudit(admin, { userId: user.id, userEmail: user.email ?? "", action: "delete", entityType: "calendar_event", entityId: id, entityTitle: event?.title ?? null });

  return NextResponse.json({ success: true });
}
