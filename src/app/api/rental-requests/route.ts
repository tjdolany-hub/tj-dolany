import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendNewRequestNotification } from "@/lib/email";

// ── Rate limiting (in-memory, resets on cold start) ──

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

// ── Schemas ──

const requestSchema = z.object({
  event_type: z.enum(["pronajem", "volne"]),
  event_name: z.string().max(100).nullable().optional(),
  organizer: z.string().max(100).nullable().optional(),
  is_public: z.boolean().default(false),
  location: z.string().min(1, "Místo je povinné"),
  date: z.string().min(1, "Datum je povinné"),
  time: z.string().nullable().optional(),
  all_day: z.boolean().default(false),
  contact_name: z.string().min(1, "Jméno je povinné").max(100),
  contact_phone: z.string().min(9, "Neplatný telefon").max(20),
  contact_email: z.string().email("Neplatný email"),
  note: z.string().max(500).nullable().optional(),
});

// ── POST: Public — create a new request ──

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Příliš mnoho žádostí. Zkuste to za hodinu." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const admin = await createServiceClient();
  const { error } = await admin.from("rental_requests").insert({
    event_name: data.event_name || null,
    event_type: data.event_type,
    organizer: data.organizer || null,
    is_public: data.event_type === "pronajem" ? false : data.is_public,
    location: data.location,
    date: data.date,
    time: data.time || null,
    all_day: data.all_day,
    contact_name: data.contact_name,
    contact_phone: data.contact_phone,
    contact_email: data.contact_email,
    note: data.note || null,
  });

  if (error) {
    return NextResponse.json({ error: "Chyba při ukládání žádosti." }, { status: 500 });
  }

  // Send notification email (non-blocking — don't fail the request)
  try {
    await sendNewRequestNotification({
      eventType: data.event_type,
      eventName: data.event_name || null,
      organizer: data.organizer || null,
      isPublic: data.event_type === "pronajem" ? false : data.is_public,
      location: data.location,
      date: data.date,
      time: data.time || null,
      allDay: data.all_day,
      contactName: data.contact_name,
      contactPhone: data.contact_phone,
      contactEmail: data.contact_email,
      note: data.note || null,
    });
  } catch {
    // Email failure should not break the request
    console.error("Failed to send rental request notification email");
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// ── GET: Admin — list requests ──

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");

  const admin = await createServiceClient();
  let query = admin
    .from("rental_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query = query.eq("status", status as "pending" | "approved" | "rejected");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
