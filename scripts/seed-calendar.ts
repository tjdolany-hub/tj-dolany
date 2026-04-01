/**
 * Seed script: imports full calendar from plan_akci.pdf into calendar_events.
 * Includes all events (private, public, non-match).
 * Usage: npx tsx scripts/seed-calendar.ts
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

// All non-match events from plan_akci.pdf
const calendarEvents = [
  { date: "2026-01-09T18:00:00", title: "Výroční schůze SDH Dolany", type: "akce", public: true },
  { date: "2026-01-23T10:00:00", title: "Soukromá akce — Milan Kejzlar", type: "pronajem", public: false },
  { date: "2026-02-06T10:00:00", title: "Soukromá akce — Markéta Rýdlová", type: "pronajem", public: false },
  { date: "2026-02-09T16:00:00", title: "Komplexní pozemkové úpravy — Obec Dolany", type: "akce", public: true },
  { date: "2026-02-12T07:30:00", title: "Pravidelné školení řidičů — Přemek Kejzlar", type: "akce", public: true },
  { date: "2026-02-20T17:00:00", title: "Setkání s kosmetičkou a orientální tanečnicí", type: "akce", public: true },
  { date: "2026-02-27T18:00:00", title: "Výroční schůze Divadelního spolku Dolany", type: "akce", public: true },
  { date: "2026-03-07T10:00:00", title: "Soukromá akce — Jiří Plšek", type: "pronajem", public: false },
  { date: "2026-03-13T08:00:00", title: "Tradiční škvaření sádla — Stará garda TJ", type: "akce", public: true },
  { date: "2026-03-21T09:00:00", title: "Velký mládežnický fotbalový turnaj", type: "akce", public: true },
  { date: "2026-04-03T10:00:00", title: "Soukromá akce — Věra Brusnická", type: "pronajem", public: false },
  { date: "2026-04-11T10:00:00", title: "Soukromá akce — Jiří Jakoubek", type: "pronajem", public: false },
  { date: "2026-04-30T17:00:00", title: "Pálení čarodějnic — Divadelní spolek", type: "akce", public: true },
  { date: "2026-05-01T09:00:00", title: "DOLANY PRO RADOST — charitativní běh se psy", type: "akce", public: true },
  { date: "2026-05-15T10:00:00", title: "Soukromá akce — Miroslav Kudrna", type: "pronajem", public: false },
  { date: "2026-05-17T08:00:00", title: "Canisterapeutické zkoušky — M. Fikejzová", type: "akce", public: true },
  { date: "2026-05-30T10:00:00", title: "Soukromá akce — Veronika Morávková", type: "pronajem", public: false },
  { date: "2026-06-06T10:00:00", title: "Dětský den — TJ Dolany", type: "akce", public: true },
  { date: "2026-06-13T10:00:00", title: "Soukromá akce — Ladislav Karban", type: "pronajem", public: false },
  { date: "2026-06-19T10:00:00", title: "Soukromá akce — Tereza Najmanová", type: "pronajem", public: false },
  { date: "2026-06-26T10:00:00", title: "Soukromá akce — Filip Šeda (TJ Dolany)", type: "pronajem", public: false },
  { date: "2026-07-03T10:00:00", title: "Soukromá akce — Kristýna Borůvková", type: "pronajem", public: false },
  { date: "2026-07-11T10:00:00", title: "Soukromá akce — Vlasta Malá a Diana Klígrová", type: "pronajem", public: false },
  { date: "2026-07-17T10:00:00", title: "Soukromá akce — Nathalie Jaklová", type: "pronajem", public: false },
  { date: "2026-07-25T10:00:00", title: "Soukromá akce — Fofonkovi", type: "pronajem", public: false },
  { date: "2026-07-31T10:00:00", title: "Soukromá akce — Jaroslav Karel", type: "pronajem", public: false },
  { date: "2026-08-14T10:00:00", title: "Soukromá akce — Lukáš Semanišin", type: "pronajem", public: false },
  { date: "2026-08-21T10:00:00", title: "Soukromá akce — Radim Rieger (termín bude upřesněn)", type: "pronajem", public: false },
  { date: "2026-09-12T10:00:00", title: "Soukromá akce — Pavel Brusnický (termín bude upřesněn)", type: "pronajem", public: false },
  { date: "2026-10-23T10:00:00", title: "Soukromá akce — Petr Souček (termín bude upřesněn)", type: "pronajem", public: false },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log(`Seeding ${calendarEvents.length} calendar events...`);

  for (const event of calendarEvents) {
    const { error } = await supabase.from("calendar_events").insert({
      title: event.title,
      date: event.date,
      event_type: event.type,
      is_public: event.public,
      location: "Sokolovna / Sportovní areál Dolany",
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
