"use client";

import { useState, useMemo } from "react";
import { JerseyIcon, BallIcon, YellowCard, RedCard } from "@/components/ui/StatIcons";
import { SeasonHalfFilter, type PeriodFilters } from "@/components/ui/SeasonHalfFilter";

export type StatsEntry = {
  player_id: string;
  season: string;
  half: "podzim" | "jaro";
  matches: number;
  goals: number;
  yellows: number;
  reds: number;
};

type SortKey = "matches" | "goals" | "yellows" | "reds";

export default function PlayerStatistics({ players, entries, seasons }: { players: { id: string; name: string }[]; entries: StatsEntry[]; seasons: string[] }) {
  const [filters, setFilters] = useState<PeriodFilters>(() => ({ seasons, halves: ["podzim", "jaro"] }));
  const [sortBy, setSortBy] = useState<SortKey>("matches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const rawStats = useMemo(() => {
    const filtered = entries.filter((e) => filters.seasons.includes(e.season) && filters.halves.includes(e.half));

    const map = new Map<string, { name: string; matches: number; goals: number; yellows: number; reds: number }>();

    for (const e of filtered) {
      if (!map.has(e.player_id)) {
        const p = players.find((pl) => pl.id === e.player_id);
        map.set(e.player_id, { name: p?.name || "?", matches: 0, goals: 0, yellows: 0, reds: 0 });
      }
      const s = map.get(e.player_id)!;
      s.matches += e.matches;
      s.goals += e.goals;
      s.yellows += e.yellows;
      s.reds += e.reds;
    }

    return [...map.values()];
  }, [entries, players, filters]);

  const stats = useMemo(() => {
    const sorted = [...rawStats].sort((a, b) => {
      const diff = sortDir === "desc" ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy];
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
    return sorted;
  }, [rawStats, sortBy, sortDir]);

  return (
    <section>
      <h2 className="text-2xl font-bold text-text tracking-tight mb-6 flex items-center justify-center gap-3">
        <span className="w-8 h-0.5 bg-brand-red rounded-full" />
        Statistiky hráčů
      </h2>

      {/* Filters */}
      <SeasonHalfFilter filters={filters} onChange={setFilters} seasons={seasons} className="justify-center mb-6" />

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
