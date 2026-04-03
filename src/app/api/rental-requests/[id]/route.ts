import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendRequestStatusNotification } from "@/lib/email";

const updateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  admin_note: z.string().max(500).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const admin = await createServiceClient();

  // Fetch the request
  const { data: request, error: fetchError } = await admin
    .from("rental_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ error: "Žádost nenalezena" }, { status: 404 });
  }

  let calendarEventId: string | null = null;

  // If approving, create a calendar event
  if (parsed.data.status === "approved") {
    const isPronajem = request.event_type === "pronajem";
    const dateTime = request.all_day
      ? `${request.date.slice(0, 10)}T00:00`
      : request.time
        ? `${request.date.slice(0, 10)}T${request.time}`
        : `${request.date.slice(0, 10)}T00:00`;

    const { data: calEvent, error: calError } = await admin
      .from("calendar_events")
      .insert({
        title: isPronajem ? "Soukromá akce" : (request.event_name || "Akce"),
        description: null,
        date: dateTime,
        end_date: null,
        event_type: request.event_type,
        location: request.location,
        organizer: isPronajem ? null : request.organizer,
        is_public: isPronajem ? true : request.is_public,
      })
      .select("id")
      .single();

    if (calError) {
      return NextResponse.json(
        { error: "Chyba při vytváření události: " + calError.message },
        { status: 500 }
      );
    }

    calendarEventId = calEvent.id;
  }

  // Update the request
  const { error: updateError } = await admin
    .from("rental_requests")
    .update({
      status: parsed.data.status,
      admin_note: parsed.data.admin_note || null,
      ...(calendarEventId ? { calendar_event_id: calendarEventId } : {}),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Send notification to requester
  try {
    const eventName =
      request.event_type === "pronajem"
        ? "Soukromá akce"
        : request.event_name || "Akce";
    await sendRequestStatusNotification(
      request.contact_email,
      parsed.data.status,
      eventName,
      request.date,
      parsed.data.admin_note || null
    );
  } catch {
    console.error("Failed to send status notification email");
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const admin = await createServiceClient();
  const { error } = await admin.from("rental_requests").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
