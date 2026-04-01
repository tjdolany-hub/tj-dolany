import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const drawSchema = z.object({
  season: z.string().min(1, "Období je povinné"),
  title: z.string().min(1, "Název je povinný"),
  image: z.string().min(1, "Obrázek je povinný"),
  active: z.boolean().default(true),
});

export async function GET() {
  const supabase = await createClient();
  const { data: draws } = await supabase
    .from("season_draws")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json(draws ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = drawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { data: draw, error } = await admin
    .from("season_draws")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(draw, { status: 201 });
}
