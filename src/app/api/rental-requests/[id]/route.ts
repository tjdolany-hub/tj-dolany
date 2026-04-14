import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendRequestStatusNotification } from "@/lib/email";
import { requireAdmin } from "@/lib/auth";

const updateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  admin_note: z.string().max(500).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

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
    // Combine date + time for calendar event
    // Europe/Prague: CET (+01:00) or CEST (+02:00)
    const datePart = request.date.slice(0, 10);
    const tempDate = new Date(datePart + "T12:00:00Z");
    const praqueOffset = tempDate.toLocaleString("en", { timeZone: "Europe/Prague", hour12: false, hour: "2-digit" });
    const utcHour = tempDate.getUTCHours();
    const localHour = parseInt(praqueOffset);
    const offsetHours = localHour - utcHour;
    const tz = `+${String(offsetHours).padStart(2, "0")}:00`;
    const dateStr = request.all_day
      ? `${datePart}T00:00:00${tz}`
      : request.time
        ? `${datePart}T${request.time}:00${tz}`
        : `${datePart}T00:00:00${tz}`;

    // Build end_date from request
    let endDateStr: string | null = null;
    if (request.end_date) {
      // Multi-day event
      const endDatePart = request.end_date.slice(0, 10);
      endDateStr = request.all_day
        ? `${endDatePart}T23:59:00${tz}`
        : request.time_to
          ? `${endDatePart}T${request.time_to}:00${tz}`
          : `${endDatePart}T23:59:00${tz}`;
    } else if (!request.all_day && request.time_to) {
      // Same day, time range
      endDateStr = `${datePart}T${request.time_to}:00${tz}`;
    }

    const { data: calEvent, error: calError } = await admin
      .from("calendar_events")
      .insert({
        title: isPronajem ? "Soukromá akce" : (request.event_name || "Akce"),
        description: isPronajem ? null : (request.description || null),
        date: dateStr,
        end_date: endDateStr,
        all_day: request.all_day,
        event_type: request.event_type,
        location: request.location,
        organizer: request.organizer,
        is_public: request.is_public,
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

  // Send notification to requester (only if they provided email)
  try {
    const eventName =
      request.event_type === "pronajem"
        ? "Soukromá akce"
        : request.event_name || "Akce";
    if (!request.contact_email) throw new Error("No contact email");
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

  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  const admin = await createServiceClient();
  const { error } = await admin.from("rental_requests").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
