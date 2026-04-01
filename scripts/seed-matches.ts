/**
 * Seed script: imports spring 2026 match schedule into Supabase.
 * Usage: npx tsx scripts/seed-matches.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const matches = [
  { date: "2026-03-28T15:00:00", opponent: "Červený Kostelec B", is_home: true, score_home: 7, score_away: 0, played: true },
  { date: "2026-04-04T16:00:00", opponent: "Deštné/Nové Město B", is_home: true, score_home: 0, score_away: 0, played: false },
  { date: "2026-04-12T16:00:00", opponent: "Zábrodí", is_home: false, score_home: 0, score_away: 0, played: false },
  { date: "2026-04-18T16:00:00", opponent: "Hronov", is_home: true, score_home: 0, score_away: 0, played: false },
  { date: "2026-04-25T17:00:00", opponent: "Česká Skalice B", is_home: false, score_home: 0, score_away: 0, played: false },
  { date: "2026-05-02T13:30:00", opponent: "Hejtmánkovice", is_home: true, score_home: 0, score_away: 0, played: false },
  { date: "2026-05-09T16:00:00", opponent: "Velká Jesenice", is_home: true, score_home: 0, score_away: 0, played: false },
  { date: "2026-05-16T17:00:00", opponent: "Machov", is_home: false, score_home: 0, score_away: 0, played: false },
  { date: "2026-05-23T14:00:00", opponent: "Babí", is_home: true, score_home: 0, score_away: 0, played: false },
  { date: "2026-05-30T17:00:00", opponent: "Velké Poříčí", is_home: false, score_home: 0, score_away: 0, played: false },
  { date: "2026-06-06T16:00:00", opponent: "Stárkov", is_home: true, score_home: 0, score_away: 0, played: false },
  { date: "2026-06-13T17:00:00", opponent: "Police B", is_home: false, score_home: 0, score_away: 0, played: false },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log("Seeding match results...");
  for (const m of matches) {
    const { played, ...rest } = m;
    const { error } = await supabase.from("match_results").insert({
      date: m.date,
      opponent: m.opponent,
      is_home: m.is_home,
      score_home: m.score_home,
      score_away: m.score_away,
      competition: "Okresní přebor - jaro 2026",
      summary: played ? "Výhra" : null,
    });
    if (error) {
      console.error(`  ERROR: ${m.opponent}:`, error.message);
    } else {
      console.log(`  OK: ${m.is_home ? "Dolany - " + m.opponent : m.opponent + " - Dolany"} (${m.date.slice(5, 10)})`);
    }
  }

  console.log("\nSeeding calendar events for upcoming matches...");
  for (const m of matches) {
    if (m.played) continue;
    const title = m.is_home
      ? `Dolany - ${m.opponent}`
      : `${m.opponent} - Dolany`;

    const { error } = await supabase.from("calendar_events").insert({
      title,
      date: m.date,
      event_type: "zapas",
      location: m.is_home ? "Hřiště TJ Dolany" : null,
      is_public: true,
    });
    if (error) {
      console.error(`  ERROR calendar: ${title}:`, error.message);
    } else {
      console.log(`  OK: ${title}`);
    }
  }

  console.log("Done!");
}

main();
