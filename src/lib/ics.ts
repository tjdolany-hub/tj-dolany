import { getDayPrague, getMonthPrague, getYearPrague, isMidnightPrague } from "@/lib/utils";

export type IcsMatch = {
  id: string;
  date: string;
  opponent: string;
  is_home: boolean;
  score_home: number;
  score_away: number;
  competition: string | null;
  venue: string | null;
  round: string | null;
  match_type: "mistrovsky" | "pratelsky";
};

export const MATCH_CALENDAR_SELECT = "id, date, opponent, is_home, score_home, score_away, competition, venue, round, match_type";

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545: lines longer than 75 octets are folded with CRLF + space. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (encoder.encode(current + char).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function pragueDateStamp(date: Date): string {
  return `${getYearPrague(date)}${String(getMonthPrague(date) + 1).padStart(2, "0")}${String(getDayPrague(date)).padStart(2, "0")}`;
}

function matchEvent(m: IcsMatch, now: Date): string[] {
  const start = new Date(m.date);
  const home = m.is_home ? "TJ Dolany" : m.opponent;
  const away = m.is_home ? m.opponent : "TJ Dolany";
  const played = start.getTime() + MATCH_DURATION_MS <= now.getTime();
  const summary = `${home} – ${away}${played ? ` ${m.score_home}:${m.score_away}` : ""}`;

  const description = [
    m.competition,
    m.round ? (/kolo/i.test(m.round) ? m.round : `${m.round}. kolo`) : null,
    m.match_type === "pratelsky" ? "Přátelský zápas" : null,
    "https://tjdolany.net/tym",
  ].filter(Boolean).join("\n");

  const lines = [
    "BEGIN:VEVENT",
    `UID:match-${m.id}@tjdolany.net`,
    `DTSTAMP:${utcStamp(now)}`,
  ];
  if (isMidnightPrague(start)) {
    // No kick-off time known — all-day event
    const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    lines.push(`DTSTART;VALUE=DATE:${pragueDateStamp(start)}`, `DTEND;VALUE=DATE:${pragueDateStamp(next)}`);
  } else {
    lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(new Date(start.getTime() + MATCH_DURATION_MS))}`);
  }
  lines.push(
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
  );
  const location = m.venue || (m.is_home ? "Dolany" : m.opponent);
  lines.push(`LOCATION:${escapeText(location)}`, "END:VEVENT");
  return lines;
}

export function buildMatchesCalendar(matches: IcsMatch[], name = "TJ Dolany – zápasy"): string {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TJ Dolany//Zapasy//CS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Europe/Prague",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...matches.flatMap((m) => matchEvent(m, now)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
