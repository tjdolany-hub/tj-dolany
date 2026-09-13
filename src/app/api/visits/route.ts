import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl|wget|python|axios/i;

/** YYYY-MM-DD in Europe/Prague, shifted back by `daysAgo`. */
function pragueDay(daysAgo = 0): string {
  const [y, m, d] = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - daysAgo)).toISOString().slice(0, 10);
}

async function getStats() {
  const supabase = await createServiceClient();
  const count = (from?: string) => {
    let q = supabase.from("site_visits").select("day", { count: "exact", head: true });
    if (from) q = q.gte("day", from);
    return q;
  };
  const [today, week, month, total] = await Promise.all([count(pragueDay()), count(pragueDay(6)), count(pragueDay(29)), count()]);
  const failed = [today, week, month, total].find((r) => r.error);
  if (failed?.error) {
    console.error(`[visits] stats failed: ${failed.error.message}`);
    return null;
  }
  return { today: today.count ?? 0, week: week.count ?? 0, month: month.count ?? 0, total: total.count ?? 0 };
}

function respond(stats: Awaited<ReturnType<typeof getStats>>, cache: string) {
  if (!stats) return NextResponse.json({ error: "Nepodařilo se načíst" }, { status: 500 });
  return NextResponse.json(stats, { headers: { "Cache-Control": cache } });
}

// GET: visitor counts (today / last 7 days / last 30 days / total)
export async function GET() {
  return respond(await getStats(), "public, s-maxage=300, stale-while-revalidate=600");
}

// POST: record this visitor for today (once per day per ip+user-agent), then return counts
export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";

  if (ua && ip && !BOT_UA.test(ua)) {
    const day = pragueDay();
    // Keyed hash — no IP or user-agent is stored; the day in the input makes hashes unlinkable across days
    const visitorHash = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`${day}|${ip}|${ua}`).digest("hex");
    const supabase = await createServiceClient();
    const { error } = await supabase
      .from("site_visits")
      .upsert({ day, visitor_hash: visitorHash }, { onConflict: "day,visitor_hash", ignoreDuplicates: true });
    if (error) console.error(`[visits] record failed: ${error.message}`);
  }

  return respond(await getStats(), "no-store");
}
