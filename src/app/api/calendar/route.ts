import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1, "Název je povinný"),
  description: z.string().nullable().optional(),
  date: z.string(),
  end_date: z.string().nullable().optional(),
  event_type: z.enum(["zapas", "trenink", "akce", "pronajem", "volne"]),
  location: z.string().nullable().optional(),
  organizer: z.string().nullable().optional(),
  is_public: z.boolean().default(true),
  all_day: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  let startDate: string;
  let endDate: string;

  if (monthParam) {
    const month = parseInt(monthParam);
    startDate = new Date(year, month - 1, 1).toISOString();
    endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
  } else {
    // No month specified — return entire year
    startDate = new Date(year, 0, 1).toISOString();
    endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
  }

  // Fetch events that start in range OR span into range (end_date >= startDate)
  const { data: startInRange } = await supabase
    .from("calendar_events")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  const { data: spanIntoRange } = await supabase
    .from("calendar_events")
    .select("*")
    .lt("date", startDate)
    .gte("end_date", startDate)
    .order("date", { ascending: true });

  // Merge and deduplicate
  const seen = new Set<string>();
  const events = [...(startInRange ?? []), ...(spanIntoRange ?? [])].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { data: event, error } = await admin
    .from("calendar_events")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(event, { status: 201 });
}
