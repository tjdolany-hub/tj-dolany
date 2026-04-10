// Shared player-name matching used by training imports, match report parser,
// and any other feature that receives external player names and needs to map
// them to rows in the `players` table.
//
// The matcher is diacritics-insensitive and checks both `name` and `aliases`,
// so entries like "Mirda Mervartak" (alias of "Miroslav Mervart") or
// "Maty Rydl" (alias of "Matyáš Rýdl") resolve correctly.

export interface MatchablePlayer {
  id: string;
  name: string;
  aliases?: string[] | null;
  first_name?: string | null;
  last_name?: string | null;
}

/** Lowercase + strip Czech diacritics for loose comparison. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Find a player by a free-text name. Checks, in order:
 *   1. exact match on name or any alias (diacritics-insensitive)
 *   2. exact match on `first_name + last_name` (if present)
 *   3. reversed name ("Novák Jan" → "Jan Novák") against name/aliases
 *   4. unambiguous surname-only match against name/aliases
 *   5. unambiguous first-name-only match against name/aliases
 *
 * Returns the matched player or undefined.
 */
export function findPlayerByName<T extends MatchablePlayer>(
  rawName: string,
  players: T[]
): T | undefined {
  const target = normalizeName(rawName);
  if (!target) return undefined;

  // Build a normalized view of each player once.
  const normalized = players.map((p) => {
    const nameNorm = normalizeName(p.name);
    const aliasNorms = (p.aliases ?? []).map(normalizeName).filter(Boolean);
    return { player: p, nameNorm, aliasNorms };
  });

  const allCandidates = (entry: (typeof normalized)[number]) =>
    [entry.nameNorm, ...entry.aliasNorms];

  // 1. Exact match on name or alias
  let hit = normalized.find((e) => allCandidates(e).includes(target));
  if (hit) return hit.player;

  // 2. first_name + last_name concatenation
  hit = normalized.find((e) => {
    const p = e.player;
    if (!p.first_name && !p.last_name) return false;
    const full = normalizeName(`${p.first_name ?? ""} ${p.last_name ?? ""}`);
    return full === target;
  });
  if (hit) return hit.player;

  const parts = target.split(/\s+/).filter(Boolean);

  // 3. Reversed name
  if (parts.length >= 2) {
    const reversed = [...parts].reverse().join(" ");
    hit = normalized.find((e) => allCandidates(e).includes(reversed));
    if (hit) return hit.player;
  }

  // 4. Unambiguous surname match (last token of input vs. any token of
  //    name/alias — catches both "Jan Novák" and "Novák Jan" inputs).
  if (parts.length >= 1) {
    const lastToken = parts[parts.length - 1];
    const firstToken = parts[0];
    const surnameMatches = normalized.filter((e) =>
      allCandidates(e).some((candidate) => {
        const tokens = candidate.split(/\s+/);
        return tokens.includes(lastToken) || tokens.includes(firstToken);
      })
    );
    if (surnameMatches.length === 1) return surnameMatches[0].player;
  }

  // 5. Unambiguous first-name match
  if (parts.length >= 1) {
    const firstToken = parts[0];
    const firstNameMatches = normalized.filter((e) =>
      allCandidates(e).some((candidate) => candidate.split(/\s+/)[0] === firstToken)
    );
    if (firstNameMatches.length === 1) return firstNameMatches[0].player;
  }

  return undefined;
}
