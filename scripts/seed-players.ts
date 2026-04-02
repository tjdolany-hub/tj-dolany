/**
 * Seed players from Excel data (team_members_export.xlsx).
 *
 * Usage:
 *   npx tsx scripts/seed-players.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (no dotenv dependency needed)
const envPath = resolve(__dirname ?? ".", "..", ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env not found, rely on existing env vars */ }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POSITION_MAP: Record<string, string> = {
  "Brankář": "brankar",
  "Obránce": "obrance",
  "Záložník": "zaloznik",
  "Útočník": "utocnik",
};

const FOOT_MAP: Record<string, string> = {
  "Pravá": "prava",
  "Levá": "leva",
};

// Dates that look wrong (year >= 2020 for adults) → null
function parseBirthDate(raw: string): string | null {
  if (!raw) return null;

  // Just a year like "1996"
  if (/^\d{4}$/.test(raw)) {
    return `${raw}-01-01`;
  }

  // DD.MM.YYYY
  const match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const year = parseInt(match[3]);
    if (year >= 2020) return null; // Likely a typo
    const month = match[2].padStart(2, "0");
    const day = match[1].padStart(2, "0");
    return `${match[3]}-${month}-${day}`;
  }

  return null;
}

const PLAYERS = [
  { first_name: "Jiří", last_name: "Berger", birth_date: "15.12.1990", nickname: "Bergino", position: "Obránce", preferred_foot: "Pravá" },
  { first_name: "Jannis", last_name: "Bleyer", birth_date: "1996", nickname: "", position: "Útočník", preferred_foot: "" },
  { first_name: "Jiří", last_name: "Dudek", birth_date: "15.1.1997", nickname: "Jerzy", position: "Záložník", preferred_foot: "" },
  { first_name: "Matěj", last_name: "Horký", birth_date: "2004", nickname: "", position: "Útočník", preferred_foot: "" },
  { first_name: "Jaroslav", last_name: "Karel", birth_date: "1989", nickname: "", position: "Obránce", preferred_foot: "Pravá" },
  { first_name: "Jakub", last_name: "Kramář", birth_date: "1992", nickname: "", position: "Útočník", preferred_foot: "" },
  { first_name: "Martin", last_name: "Kubasek", birth_date: "11.1.1983", nickname: "Kubas", position: "Brankář", preferred_foot: "Levá" },
  { first_name: "Lukáš", last_name: "Kvaček", birth_date: "22.6.1996", nickname: "Kváča", position: "Útočník", preferred_foot: "Pravá" },
  { first_name: "Roman", last_name: "Lokvenc", birth_date: "2000", nickname: "Loki", position: "Záložník", preferred_foot: "" },
  { first_name: "Kamil", last_name: "Mach", birth_date: "29.10.1990", nickname: "", position: "Záložník", preferred_foot: "Pravá" },
  { first_name: "Miroslav", last_name: "Mervart", birth_date: "1988", nickname: "", position: "Útočník", preferred_foot: "" },
  { first_name: "Samuel", last_name: "Němec", birth_date: "2002", nickname: "", position: "Záložník", preferred_foot: "" },
  { first_name: "Libor", last_name: "Praslička", birth_date: "29.8.1989", nickname: "", position: "Obránce", preferred_foot: "Pravá" },
  { first_name: "Jaromír", last_name: "Renfus", birth_date: "1984", nickname: "", position: "Záložník", preferred_foot: "Pravá" },
  { first_name: "Maty", last_name: "Rydl", birth_date: "29.8.2025", nickname: "Maty", position: "Záložník", preferred_foot: "" },
  { first_name: "Dave", last_name: "Samek", birth_date: "30.6.2001", nickname: "", position: "Brankář", preferred_foot: "" },
  { first_name: "Pavel", last_name: "Sedláček", birth_date: "27.2.2024", nickname: "Sedlis", position: "Obránce", preferred_foot: "" },
  { first_name: "Ondřej", last_name: "Sedláček", birth_date: "1989", nickname: "Sedlo", position: "Útočník", preferred_foot: "" },
  { first_name: "Lukáš", last_name: "Semanišin", birth_date: "1.5.1994", nickname: "Séma", position: "Obránce", preferred_foot: "Pravá" },
  { first_name: "Filip", last_name: "Šeda", birth_date: "11.6.1996", nickname: "Šedič", position: "Útočník", preferred_foot: "Pravá" },
  { first_name: "Ladislav", last_name: "Šrajbr", birth_date: "29.8.2023", nickname: "", position: "Obránce", preferred_foot: "" },
  { first_name: "Ivan", last_name: "Tokar", birth_date: "6.10.1972", nickname: "", position: "Útočník", preferred_foot: "Pravá" },
  { first_name: "Petr", last_name: "Toman", birth_date: "11.11.1998", nickname: "Bobeš", position: "Obránce", preferred_foot: "Pravá" },
  { first_name: "Adam", last_name: "Veinfurter", birth_date: "1.6.2006", nickname: "", position: "Útočník", preferred_foot: "" },
  { first_name: "Vojta", last_name: "Záliš", birth_date: "10.11.2001", nickname: "", position: "Záložník", preferred_foot: "Pravá" },
];

async function main() {
  console.log(`Seeding ${PLAYERS.length} players...`);

  for (const p of PLAYERS) {
    const name = `${p.first_name} ${p.last_name}`;
    const position = POSITION_MAP[p.position] || "zaloznik";
    const birthDate = parseBirthDate(p.birth_date);
    const preferredFoot = FOOT_MAP[p.preferred_foot] || null;

    const { error } = await supabase.from("players").insert({
      name,
      first_name: p.first_name,
      last_name: p.last_name,
      nickname: p.nickname || null,
      position,
      birth_date: birthDate,
      preferred_foot: preferredFoot,
      active: true,
    });

    if (error) {
      console.error(`  ✗ ${name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${name} (${position}, ${birthDate || "bez data nar."})`);
    }
  }

  console.log("Done!");
}

main().catch(console.error);
