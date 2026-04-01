import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const matchSchema = z.object({
  date: z.string(),
  opponent: z.string().min(1, "Soupeř je povinný"),
  score_home: z.number().default(0),
  score_away: z.number().default(0),
  is_home: z.boolean().default(true),
  competition: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("match_results")
    .select("*")
    .order("date", { ascending: false });

  return NextResponse.json(matches ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { data: match, error } = await admin
    .from("match_results")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(match, { status: 201 });
}
