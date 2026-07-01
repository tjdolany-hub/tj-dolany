import { NextRequest, NextResponse } from "next/server";
import { revalidatePublicPages } from "@/lib/revalidate";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("active_season")
    .eq("id", 1)
    .maybeSingle();
  return NextResponse.json({ active_season: data?.active_season ?? null });
}

const schema = z.object({
  // null resets to the date-based season
  active_season: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, "Neplatný formát sezóny (očekává se 2026/2027)")
    .nullable(),
});

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { error } = await admin
    .from("app_settings")
    .update({ active_season: parsed.data.active_season, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePublicPages();
  return NextResponse.json({ success: true });
}
