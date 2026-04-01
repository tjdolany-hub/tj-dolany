import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const playerSchema = z.object({
  name: z.string().min(1, "Jméno je povinné"),
  position: z.enum(["brankar", "obrance", "zaloznik", "utocnik"]),
  number: z.number().nullable().optional(),
  photo: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  sort_order: z.number().default(0),
  active: z.boolean().default(true),
});

export async function GET() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return NextResponse.json(players ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = playerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { data: player, error } = await admin
    .from("players")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(player, { status: 201 });
}
