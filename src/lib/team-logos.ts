/**
 * Mapping between opponent team names and their logo files.
 * Keys are normalized lowercase substrings that uniquely identify a team.
 * The lookup function tries each key against the opponent name.
 */

const LOGO_MAP: { keywords: string[]; logo: string }[] = [
  { keywords: ["hronov"], logo: "/logos/afk-hronov.jpg" },
  { keywords: ["destne", "deštné", "n.město", "n. město", "nmesto"], logo: "/logos/fk-destne-mfk-nmesto-b.jpg" },
  { keywords: ["machov"], logo: "/logos/ji-machov.jpg" },
  { keywords: ["babí", "babi"], logo: "/logos/sk-babi.jpg" },
  { keywords: ["kostelec"], logo: "/logos/sk-c-kostelec-b.jpg" },
  { keywords: ["skalice"], logo: "/logos/sk-c-skalice-b.jpg" },
  { keywords: ["jesenice"], logo: "/logos/so-v-jesenice.jpg" },
  { keywords: ["hejtmánkovice", "hejtmankovice"], logo: "/logos/so-hejtmankovice.jpg" },
  { keywords: ["stárkov", "starkov"], logo: "/logos/so-starkov.jpg" },
  { keywords: ["zábrodí", "zabrodi"], logo: "/logos/so-zabrodi.jpg" },
  { keywords: ["police"], logo: "/logos/sp-police-nm-b.jpg" },
  { keywords: ["velké poříčí", "velke porici", "poříčí", "porici"], logo: "/logos/tj-velke-porici.jpg" },
];

/** TJ Dolany's own logo */
export const DOLANY_LOGO = "/logo.png";

/**
 * Find team logo by opponent name. Returns null if no match.
 */
export function getTeamLogo(opponentName: string): string | null {
  const lower = opponentName.toLowerCase();
  for (const entry of LOGO_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.logo;
    }
  }
  return null;
}
