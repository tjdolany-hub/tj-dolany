"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Eye } from "lucide-react";
import { getSeasonList } from "@/lib/utils";

const SEASONS = getSeasonList();

type StandingsVariant = "celkem" | "doma" | "venku";
interface Standing {
  position: number;
  team_name: string;
  matches_played: number;
  wins: number;
  draws_count: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
  is_our_team: boolean;
}

const VARIANT_LABELS: Record<StandingsVariant, string> = { celkem: "Celkem", doma: "Doma", venku: "Venku" };

function parseStandingLines(lines: string[]): Standing[] {
  const results: Standing[] = [];
  for (const line of lines) {
    if (line.match(/^#\s/) || line.match(/^\s*Klub/i) || line.match(/^\s*#\s+Klub/)) continue;
    const parts = line.split(/\t/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 8) continue;
    const posStr = parts[0].replace(".", "");
    const pos = parseInt(posStr);
    if (isNaN(pos)) continue;
    const teamName = parts[1];
    const z = parseInt(parts[2]) || 0;
    const v = parseInt(parts[3]) || 0;
    const r = parseInt(parts[4]) || 0;
    const p = parseInt(parts[5]) || 0;
    let gf = 0, ga = 0;
    const scoreMatch = parts[6].match(/(\d+)\s*:\s*(\d+)/);
    let pointsIdx = 7;
    if (scoreMatch) { gf = parseInt(scoreMatch[1]); ga = parseInt(scoreMatch[2]); }
    else { gf = parseInt(parts[6]) || 0; ga = parseInt(parts[7]) || 0; pointsIdx = 8; }
    const b = parseInt(parts[pointsIdx]) || 0;
    const isOur = teamName.toLowerCase().includes("dolany");
    results.push({ position: pos, team_name: teamName, matches_played: z, wins: v, draws_count: r, losses: p, goals_for: gf, goals_against: ga, points: b, is_our_team: isOur });
  }
  return results;
}

/** Parse multi-variant text: splits by "Celkem" / "Doma" / "Venku" headers */
function parseAllVariants(text: string): Record<StandingsVariant, Standing[]> {
  const result: Record<StandingsVariant, Standing[]> = { celkem: [], doma: [], venku: [] };
  const lines = text.split("\n");
  let currentVariant: StandingsVariant = "celkem";
  const sectionLines: Record<StandingsVariant, string[]> = { celkem: [], doma: [], venku: [] };
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed === "celkem") { currentVariant = "celkem"; continue; }
    if (trimmed === "doma") { currentVariant = "doma"; continue; }
    if (trimmed === "venku") { currentVariant = "venku"; continue; }
    if (trimmed) sectionLines[currentVariant].push(line);
  }
  result.celkem = parseStandingLines(sectionLines.celkem);
  result.doma = parseStandingLines(sectionLines.doma);
  result.venku = parseStandingLines(sectionLines.venku);
  return result;
}

export default function StandingsTab() {
  const [standingsData, setStandingsData] = useState<Record<StandingsVariant, Standing[]>>({ celkem: [], doma: [], venku: [] });
  const [standingsSaving, setStandingsSaving] = useState(false);
  const [standingsSeason, setStandingsSeason] = useState("2025/2026");
  const [standingsPreviewVariant, setStandingsPreviewVariant] = useState<StandingsVariant>("celkem");
  const [standingsText, setStandingsText] = useState("");

  const loadStandings = useCallback(() => {
    fetch(`/api/standings?season=${encodeURIComponent(standingsSeason)}`)
      .then((r) => r.json())
      .then((data: Array<{ variant?: string; draws?: number; [key: string]: unknown }>) => {
        const grouped: Record<StandingsVariant, Standing[]> = { celkem: [], doma: [], venku: [] };
        if (Array.isArray(data)) {
          for (const d of data) {
            const v = (d.variant as StandingsVariant) || "celkem";
            if (grouped[v]) {
              grouped[v].push({ ...d, draws_count: (d.draws as number) ?? 0 } as unknown as Standing);
            }
          }
        }
        setStandingsData(grouped);
      });
  }, [standingsSeason]);

  useEffect(() => {
    loadStandings();
  }, [loadStandings]);

  const parseAndPreview = () => {
    const parsed = parseAllVariants(standingsText);
    setStandingsData(parsed);
  };

  const saveStandings = async () => {
    setStandingsSaving(true);
    const variants: StandingsVariant[] = ["celkem", "doma", "venku"];
    for (const variant of variants) {
      const rows = standingsData[variant];
      await fetch("/api/standings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: standingsSeason,
          variant,
          standings: rows.map((s, i) => ({
            season: standingsSeason,
            variant,
            position: i + 1,
            team_name: s.team_name,
            matches_played: s.matches_played,
            wins: s.wins,
            draws: s.draws_count,
            losses: s.losses,
            goals_for: s.goals_for,
            goals_against: s.goals_against,
            points: s.points,
            is_our_team: s.is_our_team,
          })),
        }),
      });
    }
    loadStandings();
    setStandingsSaving(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text">Tabulka soutěže</h2>
        <div className="flex gap-2">
          {SEASONS.map((s) => (
            <button key={s} onClick={() => setStandingsSeason(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${standingsSeason === s ? "bg-brand-red text-white" : "bg-surface border border-border text-text-muted"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea for pasting all 3 variants at once */}
      <div className="mb-4">
        <p className="text-xs text-text-muted mb-2">Vložte všechny 3 tabulky najednou. Začněte řádkem <strong>Celkem</strong>, pak <strong>Doma</strong>, pak <strong>Venku</strong>. Formát: # Klub Z V R P Skóre B (oddělené taby). &quot;Dolany&quot; se označí automaticky.</p>
        <textarea
          value={standingsText}
          onChange={(e) => setStandingsText(e.target.value)}
          rows={16}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-red/50"
          placeholder={"Celkem\n#\tKlub\tZ\tV\tR\tP\tSkóre\tB\n1.\tSp. Police n/M B\t14\t13\t1\t0\t48:17\t40\n...\nDoma\n#\tKlub\tZ\tV\tR\tP\tSkóre\tB\n1.\tSo. V. Jesenice\t7\t7\t0\t0\t23:4\t21\n...\nVenku\n..."}
        />
        <button type="button" onClick={parseAndPreview}
          className="mt-2 text-sm text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
          <Eye size={14} /> Zpracovat a zobrazit náhled
        </button>
      </div>

      {/* Preview with variant tabs */}
      {(standingsData.celkem.length > 0 || standingsData.doma.length > 0 || standingsData.venku.length > 0) && (
        <>
          <div className="flex gap-1 mb-3 bg-surface-muted rounded-lg p-1 w-fit">
            {(["celkem", "doma", "venku"] as const).map((v) => (
              <button key={v} onClick={() => setStandingsPreviewVariant(v)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${standingsPreviewVariant === v ? "bg-brand-red text-white" : "text-text-muted hover:text-text"}`}>
                {VARIANT_LABELS[v]}
                {standingsData[v].length > 0 && <span className="ml-1.5 text-xs opacity-70">({standingsData[v].length})</span>}
              </button>
            ))}
          </div>
          <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-text-muted">
                    <th className="px-2 py-2 text-center w-10">#</th>
                    <th className="px-3 py-2 text-left">Tým</th>
                    <th className="px-2 py-2 text-center w-12">Z</th>
                    <th className="px-2 py-2 text-center w-12">V</th>
                    <th className="px-2 py-2 text-center w-12">R</th>
                    <th className="px-2 py-2 text-center w-12">P</th>
                    <th className="px-2 py-2 text-center">Skóre</th>
                    <th className="px-2 py-2 text-center w-12 font-bold">B</th>
                  </tr>
                </thead>
                <tbody>
                  {standingsData[standingsPreviewVariant].length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-text-muted">Žádná data pro {VARIANT_LABELS[standingsPreviewVariant]}</td></tr>
                  ) : standingsData[standingsPreviewVariant].map((s, i) => (
                    <tr key={i} className={`border-b border-border last:border-0 ${s.is_our_team ? "bg-brand-red/5" : ""}`}>
                      <td className="px-2 py-1.5 text-center font-bold text-text">{s.position}</td>
                      <td className={`px-3 py-1.5 text-sm ${s.is_our_team ? "font-bold text-brand-red" : "text-text"}`}>{s.team_name}</td>
                      <td className="px-2 py-1.5 text-center text-text-muted">{s.matches_played}</td>
                      <td className="px-2 py-1.5 text-center text-text-muted">{s.wins}</td>
                      <td className="px-2 py-1.5 text-center text-text-muted">{s.draws_count}</td>
                      <td className="px-2 py-1.5 text-center text-text-muted">{s.losses}</td>
                      <td className="px-2 py-1.5 text-center text-text-muted">{s.goals_for}:{s.goals_against}</td>
                      <td className={`px-2 py-1.5 text-center font-bold ${s.is_our_team ? "text-brand-red" : "text-text"}`}>{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button onClick={saveStandings} disabled={standingsSaving}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
          <Save size={16} /> {standingsSaving ? "Ukládám..." : "Uložit všechny varianty"}
        </button>
      </div>
    </>
  );
}
