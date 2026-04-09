/**
 * Team logo lookup. Supports both dynamic DB teams and static fallback.
 * The static map is kept as a fallback for when DB data isn't available.
 */

export interface TeamEntry {
  keywords: string[];
  logo_url: string | null;
}

/** Static fallback map (mirrors initial DB seed data) */
const STATIC_MAP: TeamEntry[] = [
  { keywords: ["hronov"], logo_url: "/logos/afk-hronov.png" },
  { keywords: ["destne", "deštné", "n.město", "n. město", "nmesto"], logo_url: "/logos/fk-destne-mfk-nmesto-b.png" },
  { keywords: ["machov"], logo_url: "/logos/ji-machov.png" },
  { keywords: ["babí", "babi"], logo_url: "/logos/sk-babi.png" },
  { keywords: ["kostelec"], logo_url: "/logos/sk-c-kostelec-b.png" },
  { keywords: ["skalice"], logo_url: "/logos/sk-c-skalice-b.png" },
  { keywords: ["jesenice"], logo_url: "/logos/so-v-jesenice.png" },
  { keywords: ["hejtmánkovice", "hejtmankovice"], logo_url: "/logos/so-hejtmankovice.png" },
  { keywords: ["stárkov", "starkov"], logo_url: "/logos/so-starkov.png" },
  { keywords: ["zábrodí", "zabrodi"], logo_url: "/logos/so-zabrodi.png" },
  { keywords: ["police"], logo_url: "/logos/sp-police-nm-b.png" },
  { keywords: ["velké poříčí", "velke porici", "poříčí", "porici"], logo_url: "/logos/tj-velke-porici.png" },
];

/** TJ Dolany's own logo */
export const DOLANY_LOGO = "/logo.png";

/**
 * Find team logo by opponent name.
 * If `teams` array is provided (from DB), uses it. Otherwise falls back to static map.
 */
export function getTeamLogo(opponentName: string, teams?: TeamEntry[]): string | null {
  const source = teams && teams.length > 0 ? teams : STATIC_MAP;
  const lower = opponentName.toLowerCase();
  for (const entry of source) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.logo_url;
    }
  }
  return null;
}
