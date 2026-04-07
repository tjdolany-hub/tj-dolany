/**
 * Parses match report text copied from the district football association website.
 * Pure regex-based, no external APIs.
 *
 * Expected format:
 * Line 1: "4. 4. 2026 16:00, 16.kolo, AGRO CS 8 liga Muži"
 * Then: team names, score, goals, footer (referee etc.), lineup tables
 */

export interface ParsedGoal {
  minute: number | null;
  playerName: string;
  side: "home" | "away";
  is_penalty: boolean;
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

  // --- Phase 2: Team names ---
  // Find lines with "logo" markers, team names follow
  // Pattern: "logo\nTJ Dolany\nlogo\nFK Deštné..."
  // Or just find score line and work backwards
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
      if (headerMatch && i === 0) continue; // skip header
      teamLines.unshift(lines[i]);
      if (teamLines.length === 2) break;
    }
    if (teamLines.length === 2) {
      result.home_team = teamLines[0];
      result.away_team = teamLines[1];
    }

    // Halftime: line after score, pattern "(1:4)"
    const htLine = lines[scoreLineIdx + 1];
    if (htLine) {
      const htMatch = htLine.match(/^\((\d+):(\d+)\)$/);
      if (htMatch) {
        result.halftime_home = parseInt(htMatch[1]);
        result.halftime_away = parseInt(htMatch[2]);
      }
    }
  }

  // --- Phase 3: Goals section ---
  // Goals appear between halftime and the "Číslo utkání" footer line
  // Format alternates: home goals on left, away on right
  // Home: "Karel Jaroslav\n18." or "Rýdl Matyáš (penalta)\n63."
  // Away: "8.\nTuček Michal"
  const htLineIdx = scoreLineIdx >= 0 ? scoreLineIdx + 2 : -1;
  const footerIdx = lines.findIndex((l) => l.startsWith("Číslo utkání:") || l.startsWith("Rozhodčí:"));
  // Also find where lineups start (first occurrence of "# P Jméno" or the team name repeated)
  const lineupStartIdx = lines.findIndex(
    (l, i) => i > scoreLineIdx && /^#\s+P\s+/i.test(l)
  );

  const goalsEndIdx = footerIdx >= 0 ? footerIdx : (lineupStartIdx >= 0 ? lineupStartIdx : lines.length);

  if (htLineIdx > 0 && htLineIdx < goalsEndIdx) {
    const goalLines = lines.slice(htLineIdx, goalsEndIdx);
    parseGoals(goalLines, result);
  }

  // --- Phase 4: Footer ---
  // "Číslo utkání: 2025523A1A1605. Rozhodčí: Kašpar Adam – Šolc Petr Tata, Hejzlar Jakub. Delegát: Bárta David. Hřiště: TJ Dolany. Diváků: 40."
  const footerLine = lines.find(
    (l) => l.startsWith("Číslo utkání:") || l.startsWith("Rozhodčí:")
  );
  if (footerLine) {
    const mnMatch = footerLine.match(/Číslo utkání:\s*([^.]+)/);
    if (mnMatch) result.match_number = mnMatch[1].trim();

    const refMatch = footerLine.match(/Rozhodčí:\s*([^.]+(?:\.[^.]*)*?)(?=\s*Delegát:|\s*Hřiště:|\s*Diváků:|$)/);
    if (refMatch) result.referee = refMatch[1].trim().replace(/\.\s*$/, "");

    const delMatch = footerLine.match(/Delegát:\s*([^.]+)/);
    if (delMatch) result.delegate = delMatch[1].trim();

    const venueMatch = footerLine.match(/Hřiště:\s*([^.]+)/);
    if (venueMatch) result.venue = venueMatch[1].trim();

    const specMatch = footerLine.match(/Diváků:\s*(\d+)/);
    if (specMatch) result.spectators = parseInt(specMatch[1]);
  }

  // --- Phase 5: Lineups ---
  if (lineupStartIdx >= 0) {
    parseLineups(lines, lineupStartIdx, result);
  }

  return result;
}

function parseGoals(goalLines: string[], result: ParsedMatchReport): void {
  // Goal patterns:
  // Away goal: minute first: "8." then name "Tuček Michal"
  // Home goal: name first: "Karel Jaroslav" then minute "18."
  // Penalty: "Rýdl Matyáš (penalta)" then "63."
  // Lines are individual, so we look for minute patterns and adjacent name lines

  const minuteRegex = /^(\d+)\.$/;
  const nameRegex = /^[A-ZÁ-Ž]/; // Starts with uppercase letter

  for (let i = 0; i < goalLines.length; i++) {
    const line = goalLines[i];
    const minuteMatch = line.match(minuteRegex);

    if (minuteMatch) {
      const minute = parseInt(minuteMatch[1]);

      // Check if previous line is a name (home goal: name then minute)
      // Check if next line is a name (away goal: minute then name)
      const prevLine = i > 0 ? goalLines[i - 1] : null;
      const nextLine = i < goalLines.length - 1 ? goalLines[i + 1] : null;

      // If previous line is a name and NOT a minute → home goal
      if (prevLine && nameRegex.test(prevLine) && !minuteRegex.test(prevLine)) {
        // Already added by the name handler below, skip
        continue;
      }

      // If next line is a name → away goal
      if (nextLine && nameRegex.test(nextLine) && !minuteRegex.test(nextLine)) {
        const is_penalty = /\(penalta\)/i.test(nextLine);
        const playerName = nextLine.replace(/\s*\(penalta\)/i, "").trim();
        result.goals.push({
          minute,
          playerName,
          side: "away",
          is_penalty,
        });
        i++; // skip next line
      }
    } else if (nameRegex.test(line) && !minuteRegex.test(line)) {
      // Name line — check if next line is a minute (home goal)
      const nextLine = i < goalLines.length - 1 ? goalLines[i + 1] : null;
      if (nextLine) {
        const nextMinuteMatch = nextLine.match(minuteRegex);
        if (nextMinuteMatch) {
          const minute = parseInt(nextMinuteMatch[1]);
          const is_penalty = /\(penalta\)/i.test(line);
          const playerName = line.replace(/\s*\(penalta\)/i, "").trim();
          result.goals.push({
            minute,
            playerName,
            side: "home",
            is_penalty,
          });
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
  // Find team name headers — they appear before the "# P Jméno" rows
  // Structure:
  // "TJ Dolany"
  // "#    P    Jméno    ŽK    ČK"
  // rows...
  // "#    P    Náhradníci    ŽK    ČK"
  // rows...
  // "FK Deštné/MFK N.Město B"
  // "#    P    Jméno    ŽK    ČK"
  // rows...

  let currentTeam: "home" | "away" | null = null;
  let isStarter = true;

  // Find the first team header — it should be a line matching home or away team name
  // that appears before or at the lineup start
  for (let i = startIdx - 1; i >= 0; i--) {
    if (lines[i] === result.home_team || lines[i] === result.away_team) {
      startIdx = i;
      break;
    }
  }

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

    // Player row: "31    B    Samek David            "
    // Or with cards: "9    N    Rýdl Matyáš    13        "
    // Or with card: "13    N    Zítko Daniel    89        "
    // Tab/space separated: number, position, name, [yellow_minute], [red_minute], [goal_icon]
    const playerMatch = line.match(
      /^(\d+)\s+([BNbn])\s+(.+?)(?:\s{2,}|\t)(.*)$/
    );

    if (playerMatch) {
      const [, numStr, pos, nameRaw, rest] = playerMatch;
      const is_captain = /\[K\]/.test(nameRaw);
      const name = nameRaw.replace(/\s*\[K\]\s*/, "").trim();

      // Parse remaining columns for cards (ŽK, ČK)
      // Rest might look like "13        " (yellow at 13) or "    89    " or empty
      const restParts = rest.trim().split(/\s{2,}|\t/).filter(Boolean);
      let yellowMinute: number | null = null;
      let redMinute: number | null = null;

      // The order is ŽK then ČK
      if (restParts.length >= 1 && /^\d+$/.test(restParts[0])) {
        yellowMinute = parseInt(restParts[0]);
      }
      if (restParts.length >= 2 && /^\d+$/.test(restParts[1])) {
        redMinute = parseInt(restParts[1]);
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
