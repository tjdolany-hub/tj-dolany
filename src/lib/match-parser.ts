/**
 * Parses match report text copied from the district football association website.
 * Pure regex-based, no external APIs.
 *
 * Expected format:
 * Line 1: "4. 4. 2026 16:00, 16.kolo, AGRO CS 8 liga Muži"
 * Then: team names, score, goals, footer (referee etc.), lineup tables
 */

export interface ParsedGoal {
  minute: number;
  playerName: string;
  is_penalty: boolean;
  // Side is determined later by matching against lineups
  side?: "home" | "away";
}

export interface ParsedLineupPlayer {
  number: number | null;
  position: string | null;
  name: string;
  is_starter: boolean;
  is_captain: boolean;
  yellowMinute: number | null;
  redMinute: number | null;
}

export interface ParsedMatchReport {
  date: string; // "2026-04-04"
  time: string; // "16:00"
  round: string | null;
  competition: string | null;
  home_team: string;
  away_team: string;
  score_home: number;
  score_away: number;
  halftime_home: number | null;
  halftime_away: number | null;
  goals: ParsedGoal[];
  match_number: string | null;
  referee: string | null;
  delegate: string | null;
  venue: string | null;
  spectators: number | null;
  homeLineup: ParsedLineupPlayer[];
  awayLineup: ParsedLineupPlayer[];
}

export function parseMatchReport(text: string): ParsedMatchReport {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const result: ParsedMatchReport = {
    date: "",
    time: "",
    round: null,
    competition: null,
    home_team: "",
    away_team: "",
    score_home: 0,
    score_away: 0,
    halftime_home: null,
    halftime_away: null,
    goals: [],
    match_number: null,
    referee: null,
    delegate: null,
    venue: null,
    spectators: null,
    homeLineup: [],
    awayLineup: [],
  };

  // --- Phase 1: Header line ---
  // "4. 4. 2026 16:00, 16.kolo, AGRO CS 8 liga Muži"
  const headerMatch = lines[0]?.match(
    /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s+(\d{1,2}:\d{2})(?:\s*,\s*(\d+)\.\s*kolo)?(?:\s*,\s*(.+))?$/
  );
  if (headerMatch) {
    const [, day, month, year, time, round, competition] = headerMatch;
    result.date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    result.time = time;
    result.round = round ? `${round}. kolo` : null;
    result.competition = competition?.trim() || null;
  }

  // --- Phase 2: Team names + score ---
  const scoreLineIdx = lines.findIndex((l) => /^\d+:\d+$/.test(l));
  if (scoreLineIdx >= 0) {
    const scoreParts = lines[scoreLineIdx].match(/^(\d+):(\d+)$/);
    if (scoreParts) {
      result.score_home = parseInt(scoreParts[1]);
      result.score_away = parseInt(scoreParts[2]);
    }

    // Teams: scan backwards from score, skip "logo" lines
    const teamLines: string[] = [];
    for (let i = scoreLineIdx - 1; i >= 0; i--) {
      if (lines[i].toLowerCase() === "logo") continue;
      if (headerMatch && i === 0) continue;
      teamLines.unshift(lines[i]);
      if (teamLines.length === 2) break;
    }
    if (teamLines.length === 2) {
      result.home_team = teamLines[0];
      result.away_team = teamLines[1];
    }

    // Halftime
    const htLine = lines[scoreLineIdx + 1];
    if (htLine) {
      const htMatch = htLine.match(/^\((\d+):(\d+)\)$/);
      if (htMatch) {
        result.halftime_home = parseInt(htMatch[1]);
        result.halftime_away = parseInt(htMatch[2]);
      }
    }
  }

  // --- Phase 3: Lineups (parse BEFORE goals so we can determine sides) ---
  const lineupHeaderIdx = lines.findIndex(
    (l, i) => i > scoreLineIdx && /^#\s+P\s+/i.test(l)
  );
  if (lineupHeaderIdx >= 0) {
    // Find the team name header before the first # P line
    let lineupStartIdx = lineupHeaderIdx;
    for (let i = lineupHeaderIdx - 1; i >= 0; i--) {
      if (lines[i] === result.home_team || lines[i] === result.away_team) {
        lineupStartIdx = i;
        break;
      }
    }
    parseLineups(lines, lineupStartIdx, result);
  }

  // --- Phase 4: Goals ---
  const footerIdx = lines.findIndex((l) => l.startsWith("Číslo utkání:") || l.startsWith("Rozhodčí:"));
  const goalsEndIdx = footerIdx >= 0 ? footerIdx : (lineupHeaderIdx >= 0 ? lineupHeaderIdx - 1 : lines.length);
  const htLineIdx = scoreLineIdx >= 0 ? scoreLineIdx + 2 : -1;

  if (htLineIdx > 0 && htLineIdx < goalsEndIdx) {
    const goalLines = lines.slice(htLineIdx, goalsEndIdx);
    parseGoals(goalLines, result);
  }

  // --- Phase 5: Footer ---
  // Find the footer line (may start with "Číslo utkání:" or "Rozhodčí:")
  const footerLine = lines.find(
    (l) => l.startsWith("Číslo utkání:") || l.startsWith("Rozhodčí:")
  );
  if (footerLine) {
    // Skip Číslo utkání — we use our own auto-numbering

    const refMatch = footerLine.match(/Rozhodčí:\s*([^.]+(?:\.[^.]*)*?)(?=\s*Delegát:|\s*Hřiště:|\s*Diváků:|$)/);
    if (refMatch) result.referee = refMatch[1].trim().replace(/\.\s*$/, "");

    const delMatch = footerLine.match(/Delegát:\s*([^.]+)/);
    if (delMatch) result.delegate = delMatch[1].trim();

    const venueMatch = footerLine.match(/Hřiště:\s*([^.]+)/);
    if (venueMatch) result.venue = venueMatch[1].trim();

    const specMatch = footerLine.match(/Diváků:\s*(\d+)/);
    if (specMatch) result.spectators = parseInt(specMatch[1]);
  }

  return result;
}

function parseGoals(goalLines: string[], result: ParsedMatchReport): void {
  // In the copied text, goals appear as name/minute pairs (two-column layout linearized).
  // All goals appear as: name then minute (e.g., "Tuček Michal\n8.")
  // or with penalty: "Rýdl Matyáš (penalta)\n63."
  // We parse all as neutral, then determine side by matching against lineups.

  const minuteRegex = /^(\d+)\.$/;
  const nameRegex = /^[A-ZÁ-Ž]/;

  // Build lookup sets from lineups to determine goal sides
  const homeNames = new Set(result.homeLineup.map((p) => p.name.toLowerCase()));
  const awayNames = new Set(result.awayLineup.map((p) => p.name.toLowerCase()));

  for (let i = 0; i < goalLines.length; i++) {
    const line = goalLines[i];

    // Name line followed by minute
    if (nameRegex.test(line) && !minuteRegex.test(line)) {
      const nextLine = i < goalLines.length - 1 ? goalLines[i + 1] : null;
      if (nextLine) {
        const nextMinuteMatch = nextLine.match(minuteRegex);
        if (nextMinuteMatch) {
          const minute = parseInt(nextMinuteMatch[1]);
          const is_penalty = /\(penalta\)/i.test(line);
          const playerName = line.replace(/\s*\(penalta\)/i, "").trim();

          // Determine side by checking lineups
          const nameLower = playerName.toLowerCase();
          let side: "home" | "away" = "home"; // default
          if (awayNames.size > 0 || homeNames.size > 0) {
            // Try exact match first
            if (awayNames.has(nameLower)) {
              side = "away";
            } else if (homeNames.has(nameLower)) {
              side = "home";
            } else {
              // Try surname match (first word)
              const surname = nameLower.split(/\s+/)[0];
              const inHome = [...homeNames].some((n) => n.split(/\s+/)[0] === surname);
              const inAway = [...awayNames].some((n) => n.split(/\s+/)[0] === surname);
              if (inAway && !inHome) side = "away";
              else if (inHome && !inAway) side = "home";
            }
          }

          result.goals.push({ minute, playerName, is_penalty, side });
          i++; // skip minute line
        }
      }
    }
  }
}

function parseLineups(
  lines: string[],
  startIdx: number,
  result: ParsedMatchReport
): void {
  let currentTeam: "home" | "away" | null = null;
  let isStarter = true;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // Team name header
    if (line === result.home_team) {
      currentTeam = "home";
      isStarter = true;
      continue;
    }
    if (line === result.away_team) {
      currentTeam = "away";
      isStarter = true;
      continue;
    }

    // Table header — skip
    if (/^#\s+P\s+Jméno/i.test(line)) {
      isStarter = true;
      continue;
    }
    if (/^#\s+P\s+Náhradníci/i.test(line)) {
      isStarter = false;
      continue;
    }

    if (!currentTeam) continue;

    // Player row: "31    B    Samek David" or "9    N    Rýdl Matyáš    13"
    // After trim, trailing empty columns are gone.
    // Format: number \s+ position \s+ name [\s{2,} cardMinutes...]
    const playerMatch = line.match(
      /^(\d+)\s+([BNbn])\s+(.+)$/
    );

    if (playerMatch) {
      const [, numStr, pos, rest] = playerMatch;

      // Split the rest into name and card columns
      // Cards are numeric values separated by 2+ spaces or tabs from the name
      const parts = rest.split(/\s{2,}|\t/).filter(Boolean);
      const nameRaw = parts[0] || rest;
      const cardParts = parts.slice(1).filter((p) => /^\d+$/.test(p));

      const is_captain = /\[K\]/.test(nameRaw);
      const name = nameRaw.replace(/\s*\[K\]\s*/, "").trim();

      let yellowMinute: number | null = null;
      let redMinute: number | null = null;

      if (cardParts.length >= 1) {
        yellowMinute = parseInt(cardParts[0]);
      }
      if (cardParts.length >= 2) {
        redMinute = parseInt(cardParts[1]);
      }

      const player: ParsedLineupPlayer = {
        number: parseInt(numStr),
        position: pos.toUpperCase(),
        name,
        is_starter: isStarter,
        is_captain,
        yellowMinute,
        redMinute,
      };

      if (currentTeam === "home") {
        result.homeLineup.push(player);
      } else {
        result.awayLineup.push(player);
      }
    }
  }
}
