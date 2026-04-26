import { NextRequest, NextResponse } from "next/server";
import { revalidatePublicPages } from "@/lib/revalidate";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const scheduleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  title: z.string().min(1, "Název je povinný"),
  time_from: z.string().min(1, "Čas od je povinný"),
  time_to: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  organizer: z.string().nullable().optional(),
  valid_from: z.string().nullable().optional(),
  valid_to: z.string().nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();

  const { data: schedule } = await supabase
    .from("weekly_schedule")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("time_from", { ascending: true });

  return NextResponse.json(schedule ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { data: entry, error } = await admin
    .from("weekly_schedule")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePublicPages();
  return NextResponse.json(entry, { status: 201 });
}
