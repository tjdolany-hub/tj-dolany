import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildMatchesCalendar, MATCH_CALENDAR_SELECT, type IcsMatch } from "@/lib/ics";

// Single match as a downloadable .ics event
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return new Response("Neplatný zápas", { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase
    .from("match_results")
    .select(MATCH_CALENDAR_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) {
    return new Response("Zápas nenalezen", { status: 404 });
  }

  return new Response(buildMatchesCalendar([data as IcsMatch]), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tj-dolany-zapas.ics"',
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
