"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PlayerCard from "@/components/public/PlayerCard";
import AnimatedSection, { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import { JerseyIcon, BallIcon, YellowCard, RedCard } from "@/components/ui/StatIcons";
import { formatDateShort, POSITION_LABELS } from "@/lib/utils";
import type { Database } from "@/types/database";

type Player = Database["public"]["Tables"]["players"]["Row"];
type Draw = Database["public"]["Tables"]["season_draws"]["Row"];
type MatchResult = Database["public"]["Tables"]["match_results"]["Row"] & {
  articles?: { slug: string } | null;
};

type PlayerStats = Record<string, { matches: number; goals: number; yellows: number; reds: number }>;

const POSITION_ORDER = ["brankar", "obrance", "zaloznik", "utocnik"];

/** Determine football season (Aug–Jun) for a given date: "2025/2026" */
function getSeasonForDate(d: Date): string {
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  // Aug (7) – Dec (11) = first half of season, Jan (0) – Jul (6) = second half
  if (month >= 7) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

/** Determine half: "podzim" (Aug-Dec) or "jaro" (Jan-Jul) */
function getHalfForDate(d: Date): "podzim" | "jaro" {
  return d.getMonth() >= 7 ? "podzim" : "jaro";
}

function formatMatchTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return "";
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function MatchResultsSection({ matches }: { matches: MatchResult[] }) {
  const router = useRouter();
  const now = new Date();

  // Determine default season: season where next month falls
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultSeason = getSeasonForDate(nextMonth);
  const defaultHalf = getHalfForDate(nextMonth);

  // Extract unique seasons from data, sorted descending
  const availableSeasons = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.season) set.add(m.season);
      else set.add(getSeasonForDate(new Date(m.date)));
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [matches]);

  const [selectedSeason, setSelectedSeason] = useState(
    availableSeasons.includes(defaultSeason) ? defaultSeason : availableSeasons[0] || ""
  );
  const [selectedHalf, setSelectedHalf] = useState<"podzim" | "jaro">(defaultHalf);

  // Filter and sort matches: oldest first
  const filteredMatches = useMemo(() => {
    return matches
      .filter((m) => {
        const season = m.season || getSeasonForDate(new Date(m.date));
        if (season !== selectedSeason) return false;
        const half = getHalfForDate(new Date(m.date));
        return half === selectedHalf;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [matches, selectedSeason, selectedHalf]);

  const isPlayed = (match: MatchResult) => new Date(match.date) <= now;

  return (
    <AnimatedSection className="mb-16">
      <section>
        <h2 className="text-3xl font-bold text-text tracking-tight mb-6 text-center">
          Výsledky zápasů
        </h2>

        {/* Season filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {availableSeasons.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSeason(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSeason === s
                  ? "bg-brand-red text-white"
                  : "bg-surface border border-border text-text-muted hover:text-text"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Jaro / Podzim toggle */}
        <div className="flex justify-center gap-2 mb-8">
          {(["podzim", "jaro"] as const).map((half) => (
            <button
              key={half}
              onClick={() => setSelectedHalf(half)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedHalf === half
                  ? "bg-brand-yellow text-brand-dark"
                  : "bg-surface border border-border text-text-muted hover:text-text"
              }`}
            >
              {half === "podzim" ? "Podzim" : "Jaro"}
            </button>
          ))}
        </div>

        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="text-center px-2 py-3 font-semibold text-text-muted w-10" title="Domácí / Venkovní">D/V</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Čas</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Datum</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Soupeř</th>
                  <th className="text-center px-4 py-3 font-semibold text-text-muted">Skóre</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted hidden md:table-cell">Soutěž</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((match) => {
                  const played = isPlayed(match);
                  const hasArticle = !!match.articles?.slug;
                  const clickable = played && hasArticle;
                  const isWin = played && (match.is_home
                    ? match.score_home > match.score_away
                    : match.score_away > match.score_home);
                  const isDraw = played && match.score_home === match.score_away;
                  const time = formatMatchTime(match.date);

                  return (
                    <tr
                      key={match.id}
                      onClick={clickable ? () => router.push(`/aktuality/${match.articles!.slug}`) : undefined}
                      className={`border-b border-border last:border-0 transition-colors ${
                        clickable ? "hover:bg-surface-muted cursor-pointer" : "hover:bg-surface-muted"
                      } ${match.is_home ? "border-l-3 border-l-brand-red" : "border-l-3 border-l-blue-400"}`}
                    >
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          match.is_home
                            ? "bg-brand-red/10 text-brand-red"
                            : "bg-blue-100 text-blue-600"
                        }`}>
                          {match.is_home ? "D" : "V"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap tabular-nums">
                        {time || "—"}
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {formatDateShort(match.date)}
                      </td>
                      <td className="px-4 py-3 text-text font-medium">
                        {match.is_home ? "TJ Dolany" : match.opponent}
                        {" vs. "}
                        {match.is_home ? match.opponent : "TJ Dolany"}
                        {clickable && (
                          <span className="ml-2 text-[10px] text-brand-red font-semibold">▸ referát</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {played ? (
                          <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                            isWin ? "bg-green-100 text-green-700" :
                            isDraw ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {match.score_home}:{match.score_away}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                        {match.competition || "—"}
                      </td>
                    </tr>
                  );
                })}
                {filteredMatches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                      Žádné zápasy pro {selectedSeason} – {selectedHalf === "podzim" ? "podzim" : "jaro"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}

type LeagueStanding = {
  position: number;
  team_name: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
  is_our_team: boolean;
  variant?: "celkem" | "doma" | "venku";
};

/** Full player statistics with season/half filters */
type SortKey = "matches" | "goals" | "yellows" | "reds";

function PlayerStatistics({ players, entries, seasons }: { players: { id: string; name: string }[]; entries: StatsEntry[]; seasons: string[] }) {
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterHalf, setFilterHalf] = useState<"all" | "podzim" | "jaro">("all");
  const [sortBy, setSortBy] = useState<SortKey>("matches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const rawStats = useMemo(() => {
    const filtered = entries.filter((e) => {
      if (filterSeason !== "all" && e.season !== filterSeason) return false;
      if (filterHalf !== "all" && e.half !== filterHalf) return false;
      return true;
    });

    const map = new Map<string, { name: string; matches: number; goals: number; yellows: number; reds: number }>();

    for (const e of filtered) {
      if (!map.has(e.player_id)) {
        const p = players.find((pl) => pl.id === e.player_id);
        map.set(e.player_id, { name: p?.name || "?", matches: 0, goals: 0, yellows: 0, reds: 0 });
      }
      const s = map.get(e.player_id)!;
      if (e.type === "lineup") s.matches++;
      else if (e.type === "goal") s.goals += e.goals;
      else if (e.type === "card") {
        if (e.card_type === "yellow") s.yellows++;
        else s.reds++;
      }
    }

    return [...map.values()];
  }, [entries, players, filterSeason, filterHalf]);

  const stats = useMemo(() => {
    const sorted = [...rawStats].sort((a, b) => {
      const diff = sortDir === "desc" ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy];
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
    return sorted;
  }, [rawStats, sortBy, sortDir]);

  return (
    <section>
      <h2 className="text-3xl font-bold text-text tracking-tight mb-6 text-center">
        Statistiky hráčů
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <div className="flex gap-1 bg-surface-muted rounded-lg p-1">
          <button onClick={() => setFilterSeason("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterSeason === "all" ? "bg-brand-red text-white" : "text-text-muted hover:text-text"}`}>
            Celkově
          </button>
          {seasons.map((s) => (
            <button key={s} onClick={() => setFilterSeason(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterSeason === s ? "bg-brand-red text-white" : "text-text-muted hover:text-text"}`}>
              {s}
            </button>
          ))}
        </div>
        {filterSeason !== "all" && (
          <div className="flex gap-1 bg-surface-muted rounded-lg p-1">
            <button onClick={() => setFilterHalf("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterHalf === "all" ? "bg-brand-red text-white" : "text-text-muted hover:text-text"}`}>
              Celá sezóna
            </button>
            <button onClick={() => setFilterHalf("podzim")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterHalf === "podzim" ? "bg-brand-red text-white" : "text-text-muted hover:text-text"}`}>
              Podzim
            </button>
            <button onClick={() => setFilterHalf("jaro")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterHalf === "jaro" ? "bg-brand-red text-white" : "text-text-muted hover:text-text"}`}>
              Jaro
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden max-w-4xl mx-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="px-3 py-3 text-center font-semibold text-text-muted w-10">#</th>
                <th className="px-4 py-3 text-left font-semibold text-text-muted">Hráč</th>
                {([
                  { key: "matches" as SortKey, icon: <JerseyIcon className="w-4 h-4 mx-auto" />, title: "Zápasy" },
                  { key: "goals" as SortKey, icon: <BallIcon className="w-4 h-4 mx-auto" />, title: "Góly" },
                  { key: "yellows" as SortKey, icon: <YellowCard className="w-3.5 h-4.5 mx-auto" />, title: "Žluté karty" },
                  { key: "reds" as SortKey, icon: <RedCard className="w-3.5 h-4.5 mx-auto" />, title: "Červené karty" },
                ]).map(({ key, icon, title }) => (
                  <th key={key} className="px-3 py-3 text-center font-semibold text-text-muted cursor-pointer select-none hover:text-text transition-colors" title={title}
                    onClick={() => toggleSort(key)}>
                    <span className="inline-flex items-center gap-1 justify-center">
                      {icon}
                      {sortBy === key && <span className="text-[10px] text-brand-red">{sortDir === "desc" ? "▼" : "▲"}</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Žádné záznamy pro vybraný filtr</td></tr>
              ) : stats.map((s, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-muted transition-colors">
                  <td className="px-3 py-2.5 text-center font-bold text-text-muted text-xs">{i + 1}.</td>
                  <td className="px-4 py-2.5 font-medium text-text">{s.name}</td>
                  <td className="px-3 py-2.5 text-center text-text-muted font-semibold">{s.matches}</td>
                  <td className="px-3 py-2.5 text-center text-text-muted font-semibold">{s.goals || "–"}</td>
                  <td className="px-3 py-2.5 text-center text-text-muted font-semibold">{s.yellows || "–"}</td>
                  <td className="px-3 py-2.5 text-center text-text-muted font-semibold">{s.reds || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

type StandingsVariant = "celkem" | "doma" | "venku";
const VARIANT_LABELS: Record<StandingsVariant, string> = { celkem: "Celkem", doma: "Doma", venku: "Venku" };

function LeagueTable({ standings }: { standings: LeagueStanding[] }) {
  const [variant, setVariant] = useState<StandingsVariant>("celkem");

  const grouped = useMemo(() => {
    const g: Record<StandingsVariant, LeagueStanding[]> = { celkem: [], doma: [], venku: [] };
    for (const s of standings) {
      const v = s.variant || "celkem";
      g[v].push(s);
    }
    // Sort each by position
    for (const v of Object.keys(g) as StandingsVariant[]) {
      g[v].sort((a, b) => a.position - b.position);
    }
    return g;
  }, [standings]);

  const availableVariants = (["celkem", "doma", "venku"] as const).filter((v) => grouped[v].length > 0);
  const rows = grouped[variant].length > 0 ? grouped[variant] : grouped.celkem;

  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="text-3xl font-bold text-text tracking-tight mb-6 text-center">
        Tabulka soutěže
      </h2>

      {availableVariants.length > 1 && (
        <div className="flex justify-center gap-1 mb-4 bg-surface-muted rounded-lg p-1 w-fit mx-auto">
          {availableVariants.map((v) => (
            <button key={v} onClick={() => setVariant(v)}
              className={`px-5 py-1.5 rounded-md text-sm font-semibold transition-colors ${variant === v ? "bg-brand-red text-white" : "text-text-muted hover:text-text"}`}>
              {VARIANT_LABELS[v]}
            </button>
          ))}
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden max-w-4xl mx-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="px-3 py-3 text-center font-semibold text-text-muted w-10">#</th>
                <th className="px-4 py-3 text-left font-semibold text-text-muted">Tým</th>
                <th className="px-2 py-3 text-center font-semibold text-text-muted">Z</th>
                <th className="px-2 py-3 text-center font-semibold text-text-muted">V</th>
                <th className="px-2 py-3 text-center font-semibold text-text-muted">R</th>
                <th className="px-2 py-3 text-center font-semibold text-text-muted">P</th>
                <th className="px-2 py-3 text-center font-semibold text-text-muted">Skóre</th>
                <th className="px-3 py-3 text-center font-bold text-text-muted">B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.position} className={`border-b border-border last:border-0 transition-colors ${
                  s.is_our_team ? "bg-brand-red/10 font-bold" : "hover:bg-surface-muted"
                }`}>
                  <td className="px-3 py-2.5 text-center font-bold text-text">{s.position}.</td>
                  <td className={`px-4 py-2.5 ${s.is_our_team ? "text-brand-red font-bold" : "text-text"}`}>
                    {s.team_name}
                  </td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{s.matches_played}</td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{s.wins}</td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{s.draws}</td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{s.losses}</td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{s.goals_for}:{s.goals_against}</td>
                  <td className={`px-3 py-2.5 text-center font-bold ${s.is_our_team ? "text-brand-red" : "text-text"}`}>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

type StatsEntry = {
  player_id: string;
  season: string;
  half: "podzim" | "jaro";
  type: "lineup" | "goal" | "card";
  goals: number;
  card_type: string | null;
};

export default function TymClient({
  players,
  draws,
  matches,
  playerStats,
  standings,
  statsEntries,
  availableSeasons,
}: {
  players: Player[];
  draws: Draw[];
  matches: MatchResult[];
  playerStats?: PlayerStats;
  standings?: LeagueStanding[];
  statsEntries?: StatsEntry[];
  availableSeasons?: string[];
}) {
  const grouped = POSITION_ORDER.map((pos) => ({
    position: pos,
    label: POSITION_LABELS[pos] ? POSITION_LABELS[pos].replace(/ář$/, "áři").replace(/ce$/, "ci").replace(/ík$/, "íci") : pos,
    players: players.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0);

  // Fix plural labels
  const PLURAL_LABELS: Record<string, string> = {
    brankar: "Brankáři",
    obrance: "Obránci",
    zaloznik: "Záložníci",
    utocnik: "Útočníci",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2">Náš tým</p>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">
          Tým
        </h1>
      </motion.div>

      {/* Squad */}
      <section className="mb-16">
        <AnimatedSection>
          <h2 className="text-3xl font-bold text-text tracking-tight mb-10 text-center">
            Kádr mužstva
          </h2>
        </AnimatedSection>

        {grouped.map((group) => (
          <AnimatedSection key={group.position} className="mb-12">
            <h3 className="text-xl font-bold text-brand-red mb-6 flex items-center gap-3">
              <span className="w-8 h-0.5 bg-brand-red rounded-full" />
              {PLURAL_LABELS[group.position] || group.label}
            </h3>
            <StaggerContainer className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {group.players.map((player) => (
                <StaggerItem key={player.id}>
                  <PlayerCard
                    id={player.id}
                    name={player.name}
                    first_name={player.first_name}
                    last_name={player.last_name}
                    nickname={player.nickname}
                    birth_date={player.birth_date}
                    position={player.position}
                    number={player.number}
                    photo={player.photo}
                    description={player.description}
                    stats={playerStats?.[player.id] ?? null}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </AnimatedSection>
        ))}

        {players.length === 0 && (
          <p className="text-center text-text-muted py-12 text-lg">
            Kádr zatím není vyplněn.
          </p>
        )}
      </section>

      {/* Match results */}
      {matches.length > 0 && (
        <MatchResultsSection matches={matches} />
      )}

      {/* League table */}
      {standings && standings.length > 0 && (
        <AnimatedSection className="mb-16">
          <LeagueTable standings={standings} />
        </AnimatedSection>
      )}

      {/* Player statistics */}
      {statsEntries && statsEntries.length > 0 && availableSeasons && availableSeasons.length > 0 && (
        <AnimatedSection className="mb-16">
          <PlayerStatistics players={players} entries={statsEntries} seasons={availableSeasons} />
        </AnimatedSection>
      )}

      {/* Season draws */}
      {draws.length > 0 && (
        <AnimatedSection>
          <section>
            <h2 className="text-3xl font-bold text-text tracking-tight mb-10 text-center">
              Los soutěže
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {draws.map((draw) => (
                <motion.div
                  key={draw.id}
                  whileHover={{ y: -4 }}
                  className="bg-surface rounded-xl border border-border p-5 card-hover"
                >
                  <h3 className="font-bold text-text text-lg mb-4 text-center tracking-tight">
                    {draw.title}
                  </h3>
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                    <Image
                      src={draw.image}
                      alt={draw.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </AnimatedSection>
      )}
    </div>
  );
}
