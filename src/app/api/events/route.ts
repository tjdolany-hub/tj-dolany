import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1, "Název je povinný"),
  description: z.string().nullable().optional(),
  date: z.string(),
  poster: z.string().nullable().optional(),
  published: z.boolean().default(true),
  sort_order: z.number().default(0),
});

export async function GET() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("future_events")
    .select("*")
    .order("date", { ascending: true });

  return NextResponse.json(events ?? []);
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
    .from("future_events")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(event, { status: 201 });
}
