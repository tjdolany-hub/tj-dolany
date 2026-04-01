/**
 * Seed script: imports public events from plan_akci.pdf into Supabase future_events.
 * Only non-private, non-match events are imported.
 * Usage: npx tsx scripts/seed-events.ts
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

// Public (non-private, non-football-match) events from plan_akci.pdf
const events = [
  {
    date: "2026-01-09T18:00:00",
    title: "Výroční schůze SDH Dolany",
    description: "Výroční schůze Sboru dobrovolných hasičů Dolany.",
  },
  {
    date: "2026-02-09T16:00:00",
    title: "Komplexní pozemkové úpravy v katastrálním území Čáslavky",
    description: "Veřejné projednání pozemkových úprav. Pořadatel: Obec Dolany.",
  },
  {
    date: "2026-02-20T17:00:00",
    title: "Setkání s kosmetičkou a orientální tanečnicí",
    description: "Kulturní akce v sokolovně. Pořadatel: Jarmila Rathouská.",
  },
  {
    date: "2026-02-27T18:00:00",
    title: "Výroční schůze Divadelního spolku Dolany",
    description: "Výroční schůze divadelního spolku.",
  },
  {
    date: "2026-03-13T08:00:00",
    title: "Tradiční škvaření sádla",
    description: "Tradiční akce Staré gardy TJ Dolany. 13.–14. března.",
  },
  {
    date: "2026-03-21T09:00:00",
    title: "Velký mládežnický fotbalový turnaj",
    description: "Turnaj mládeže pořádaný TJ Dolany a OFS Náchod.",
  },
  {
    date: "2026-04-30T17:00:00",
    title: "Pálení čarodějnic",
    description: "Tradiční pálení čarodějnic. Pořadatel: Divadelní spolek Dolany.",
  },
  {
    date: "2026-05-01T09:00:00",
    title: "DOLANY PRO RADOST — charitativní běh se psy",
    description: "Charitativní běh se psy. Pořadatelé: Diana Vávrová a Jiří Berger ml.",
  },
  {
    date: "2026-05-17T08:00:00",
    title: "Canisterapeutické zkoušky",
    description: "Canisterapeutické zkoušky 8:00–15:00. Pořadatel: M. Fikejzová.",
  },
  {
    date: "2026-06-06T10:00:00",
    title: "Dětský den",
    description: "Dětský den na hřišti TJ Dolany, 10:00–14:00. Pořadatel: TJ Dolany.",
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log(`Seeding ${events.length} public events...`);

  for (const event of events) {
    const { error } = await supabase.from("future_events").insert({
      title: event.title,
      description: event.description,
      date: event.date,
      published: true,
    });

    if (error) {
      console.error(`  ERROR: ${event.title}:`, error.message);
    } else {
      console.log(`  OK: ${event.title} (${event.date.slice(0, 10)})`);
    }
  }

  console.log("Done!");
}

main();
