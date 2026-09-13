import { createClient } from "@supabase/supabase-js";
import { buildMatchesCalendar, MATCH_CALENDAR_SELECT, type IcsMatch } from "@/lib/ics";

// Public calendar subscription feed (webcal) with all matches — home/away, league/friendly.
export async function GET() {
  // Cookie-less anon client: public data only, response can be CDN-cached
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("match_results")
    .select(MATCH_CALENDAR_SELECT)
    .is("deleted_at", null)
    .gte("date", since)
    .order("date", { ascending: true });

  if (error) {
    return new Response("Kalendář se nepodařilo načíst", { status: 500 });
  }

  return new Response(buildMatchesCalendar((data ?? []) as IcsMatch[]), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tj-dolany-zapasy.ics"',
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
