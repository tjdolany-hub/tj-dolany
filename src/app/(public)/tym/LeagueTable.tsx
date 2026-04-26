"use client";

import { useState, useMemo } from "react";

export type LeagueStanding = {
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

type StandingsVariant = "celkem" | "doma" | "venku";
const VARIANT_LABELS: Record<StandingsVariant, string> = { celkem: "Celkem", doma: "Doma", venku: "Venku" };

export default function LeagueTable({ standings }: { standings: LeagueStanding[] }) {
  const [variant, setVariant] = useState<StandingsVariant>("celkem");

  const grouped = useMemo(() => {
    const g: Record<StandingsVariant, LeagueStanding[]> = { celkem: [], doma: [], venku: [] };
    for (const s of standings) {
      const v = s.variant || "celkem";
      g[v].push(s);
    }
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
      <h2 className="text-2xl font-bold text-text tracking-tight mb-6 flex items-center justify-center gap-3">
        <span className="w-8 h-0.5 bg-brand-red rounded-full" />
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
