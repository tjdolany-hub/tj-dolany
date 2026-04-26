import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { recomputeAllSeasons } from "@/lib/stats";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const admin = await createServiceClient();
  const seasons = await recomputeAllSeasons(admin);

  return NextResponse.json({ ok: true, seasons });
}
