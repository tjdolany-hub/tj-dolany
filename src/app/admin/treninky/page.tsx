"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload, CheckCircle, AlertTriangle, Users, Trophy, ClipboardPaste,
  ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { getHoursPrague, formatTimePrague } from "@/lib/utils";

// ── Types ──

interface Player {
  id: string;
  name: string;
  position: string;
  active: boolean;
}

interface Training {
  id: string;
  date: string;
  title: string;
  type: "trenink" | "zapas";
  season: string | null;
  training_attendance: { player_id: string; response: string }[];
}

interface PlayerStat {
  player_id: string;
  jde: number;
  nejde: number;
  neodpovedel: number;
  total: number;
  attendance_rate: number;
}

interface ParsedColumn {
  title: string;
  date: string;
  type: "trenink" | "zapas";
}

interface ParsedRow {
  playerName: string;
  position: string;
  responses: string[];
}

interface ParseResult {
  columns: ParsedColumn[];
  rows: ParsedRow[];
  warnings: string[];
}

// ── Constants ──

const SEASONS = ["2025/2026", "2024/2025", "2023/2024"];

const RESPONSE_COLORS: Record<string, string> = {
  jde: "bg-green-500/20 text-green-400 border-green-500/30",
  nejde: "bg-red-500/20 text-red-400 border-red-500/30",
  neodpovedel: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const RESPONSE_LABELS: Record<string, string> = {
  jde: "Jde",
  nejde: "Nejde",
  neodpovedel: "Neodp.",
};

// ── Parse logic ──

function parseTrainingText(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { columns: [], rows: [], warnings: ["Nedostatek řádků (min. 2: hlavička + data)"] };
  }

  // Parse header: first 2 columns are name and position, rest are training dates
  const headerCells = lines[0].split("\t");
  const columns: ParsedColumn[] = [];

  for (let i = 2; i < headerCells.length; i++) {
    const raw = headerCells[i].trim();
    if (!raw) continue;

    // Parse column header: "Trénink (8.4.2026 17:00)" or "SOKOL ZÁBRODÍ vs. TJ DOLANY (12..."
    // or "TJ DOLANY vs. AFK..."
    const parsed = parseColumnHeader(raw);
    columns.push(parsed);
  }

  // Parse rows
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    const playerName = cells[0]?.trim();
    if (!playerName) continue;

    const position = cells[1]?.trim() || "";
    const responses: string[] = [];

    for (let j = 2; j < 2 + columns.length; j++) {
      const val = (cells[j] || "").trim().toUpperCase();
      if (val === "JDE") responses.push("jde");
      else if (val === "NEJDE") responses.push("nejde");
      else responses.push("neodpovedel");
    }

    rows.push({ playerName, position, responses });
  }

  return { columns, rows, warnings };
}

function parseColumnHeader(raw: string): ParsedColumn {
  // Try to extract date from parentheses: "Trénink (8.4.2026 17:00)"
  const dateMatch = raw.match(/\((\d{1,2})\.(\d{1,2})\.(\d{4})\s*(\d{1,2}:\d{2})?\)/);

  let date = "";
  let title = raw;
  let type: "trenink" | "zapas" = "trenink";

  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    const year = dateMatch[3];
    const time = dateMatch[4] || "00:00";
    date = `${year}-${month}-${day}T${time}:00`;
    title = raw.replace(/\s*\(.*\)\s*/, "").trim();
  }

  // Detect match type: if it contains "vs." or team names, it's a match
  if (raw.toLowerCase().includes("vs.") || raw.toLowerCase().includes("dolany")) {
    type = "zapas";
    if (!title || title === raw) {
      title = raw.replace(/\s*\(.*\)\s*/, "").trim();
    }
  }

  // If title still contains "Trénink" or is just "Trénink", standardize
  if (title.toLowerCase().startsWith("trénink") || title.toLowerCase().startsWith("trenink")) {
    type = "trenink";
    if (!title || title.toLowerCase() === "trénink" || title.toLowerCase() === "trenink") {
      title = "Trénink";
    }
  }

  return { title, date, type };
}

// Calculate season from date
function getSeason(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  // Season: July+ = current year start, before July = previous year start
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

// ── Component ──

export default function AdminTreninkyPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [season, setSeason] = useState("2025/2026");
  const [loading, setLoading] = useState(true);

  // Import state
  const [pasteText, setPasteText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [playerMatches, setPlayerMatches] = useState<Map<string, string | null>>(new Map());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    updated: number;
    trainings: number;
    warnings: string[];
  } | null>(null);

  // View state
  const [showImport, setShowImport] = useState(false);
  const [expandedTraining, setExpandedTraining] = useState<string | null>(null);

  // ── Load data ──

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/players").then((r) => r.json()),
      fetch(`/api/trainings?season=${encodeURIComponent(season)}`).then((r) => r.json()),
      fetch(`/api/trainings/stats?season=${encodeURIComponent(season)}`).then((r) => r.json()),
    ]).then(([p, t, s]) => {
      setPlayers(Array.isArray(p) ? p : []);
      setTrainings(Array.isArray(t) ? t : []);
      setStats(Array.isArray(s) ? s : []);
    }).finally(() => setLoading(false));
  }, [season]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Parse ──

  const handleParse = () => {
    if (!pasteText.trim()) return;
    const result = parseTrainingText(pasteText);
    setParseResult(result);
    setImportResult(null);

    // Auto-match player names
    const matches = new Map<string, string | null>();
    for (const row of result.rows) {
      const matched = findPlayerByName(row.playerName, players);
      matches.set(row.playerName, matched?.id ?? null);
    }
    setPlayerMatches(matches);
  };

  // ── Import ──

  const handleImport = async () => {
    if (!parseResult) return;
    setImporting(true);

    const autoSeason = parseResult.columns[0]?.date
      ? getSeason(parseResult.columns[0].date)
      : season;

    const body = {
      trainings: parseResult.columns.map((c) => ({
        date: c.date,
        title: c.title,
        type: c.type,
      })),
      attendance: parseResult.rows
        .filter((r) => playerMatches.get(r.playerName))
        .map((r) => ({
          playerName: r.playerName,
          responses: r.responses.map((resp, idx) => ({
            trainingIndex: idx,
            response: resp as "jde" | "nejde" | "neodpovedel",
          })),
        })),
      season: autoSeason,
    };

    try {
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (res.ok) {
        setImportResult(result);
        loadData();
      } else {
        setImportResult({ success: false, imported: 0, updated: 0, trainings: 0, warnings: [result.error || "Chyba importu"] });
      }
    } catch {
      setImportResult({ success: false, imported: 0, updated: 0, trainings: 0, warnings: ["Síťová chyba"] });
    } finally {
      setImporting(false);
    }
  };

  const deleteTraining = async (id: string) => {
    if (!confirm("Smazat tento trénink a všechny záznamy docházky?")) return;
    await fetch(`/api/trainings?id=${id}`, { method: "DELETE" });
    loadData();
  };

  // ── Player name matching ──

  function findPlayerByName(name: string, playerList: Player[]): Player | undefined {
    const nameLower = name.trim().toLowerCase();
    // Exact match
    let match = playerList.find((p) => p.name.toLowerCase() === nameLower);
    if (match) return match;

    // Reversed name
    const parts = nameLower.split(/\s+/);
    if (parts.length >= 2) {
      const reversed = [...parts].reverse().join(" ");
      match = playerList.find((p) => p.name.toLowerCase() === reversed);
      if (match) return match;
    }

    // Surname match (unambiguous)
    if (parts.length >= 1) {
      const surname = parts[parts.length - 1];
      const surnameMatches = playerList.filter((p) => {
        const pParts = p.name.toLowerCase().split(/\s+/);
        return pParts.some((pp) => pp === surname);
      });
      if (surnameMatches.length === 1) return surnameMatches[0];
    }

    return undefined;
  }

  // ── Render helpers ──

  const getPlayerName = (playerId: string) =>
    players.find((p) => p.id === playerId)?.name ?? "?";

  const unmatchedCount = parseResult
    ? [...playerMatches.values()].filter((v) => v === null).length
    : 0;

  // ── Render ──

  return (
    <div>
      <h1 className="text-3xl font-bold text-text mb-6">Tréninky</h1>

      {/* Season filter + import toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {SEASONS.map((s) => (
            <button key={s} onClick={() => setSeason(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                season === s ? "bg-brand-red text-white" : "bg-surface border border-border text-text-muted hover:text-text"
              }`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowImport(!showImport)}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
          <Upload size={16} /> Import docházky
        </button>
      </div>

      {/* ═══ IMPORT SECTION ═══ */}
      {showImport && (
        <div className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <ClipboardPaste size={18} className="text-brand-red" /> Import z Excelu
          </h2>
          <p className="text-sm text-text-muted">
            Zkopírujte data z Excelu (Ctrl+C) a vložte sem (Ctrl+V).
            První řádek = hlavička (sloupce: jméno, podskupina, tréninky...).
            Hodnoty: JDE / NEJDE / NEODPOVĚDĚL.
          </p>

          <textarea
            value={pasteText}
            onChange={(e) => { setPasteText(e.target.value); setParseResult(null); setImportResult(null); }}
            placeholder={"Jméno\tPodskupina\tTrénink (8.4.2026 17:00)\tZápas vs. Soupeř (12.4.)\n" +
              "Jan Novák\tOBRÁNCI\tJDE\tNEJDE\n..."}
            rows={6}
            className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red font-mono resize-y"
          />

          <div className="flex gap-2">
            <button onClick={handleParse} disabled={!pasteText.trim()}
              className="px-4 py-2 bg-brand-red text-white rounded-lg text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50 transition-colors flex items-center gap-2">
              <ClipboardPaste size={14} /> Načíst data
            </button>
            {parseResult && (
              <button onClick={handleImport} disabled={importing || !parseResult.columns.length}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                <Upload size={14} /> {importing ? "Importuji..." : "Importovat do databáze"}
              </button>
            )}
          </div>

          {/* Import result */}
          {importResult && (
            <div className={`p-4 rounded-lg border ${importResult.success ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              {importResult.success ? (
                <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
                  <CheckCircle size={16} />
                  Import dokončen: {importResult.imported} nových, {importResult.updated} aktualizovaných, {importResult.trainings} tréninků
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <AlertTriangle size={16} /> Chyba importu
                </div>
              )}
              {importResult.warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {importResult.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-yellow-400 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Preview parsed data */}
          {parseResult && parseResult.columns.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-text">
                Náhled: {parseResult.columns.length} tréninků, {parseResult.rows.length} hráčů
                {unmatchedCount > 0 && (
                  <span className="ml-2 text-yellow-400">
                    <AlertTriangle size={14} className="inline" /> {unmatchedCount} nespárovaných hráčů
                  </span>
                )}
              </h3>

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="space-y-1">
                  {parseResult.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-yellow-400 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Training columns preview */}
              <div className="flex flex-wrap gap-2">
                {parseResult.columns.map((col, i) => (
                  <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    col.type === "zapas" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  }`}>
                    {col.title}
                    {col.date && (
                      <span className="ml-1 opacity-70">
                        ({new Date(col.date).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })})
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Players preview table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-muted">
                      <th className="text-left p-2 font-semibold text-text sticky left-0 bg-surface-muted">Hráč</th>
                      <th className="text-left p-2 font-semibold text-text">Stav</th>
                      {parseResult.columns.map((col, i) => (
                        <th key={i} className="text-center p-2 font-semibold text-text whitespace-nowrap text-xs">
                          {col.date ? new Date(col.date).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" }) : `#${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.map((row, ri) => {
                      const matched = playerMatches.get(row.playerName);
                      return (
                        <tr key={ri} className={`border-t border-border ${matched === null ? "bg-yellow-500/5" : ""}`}>
                          <td className="p-2 text-text font-medium sticky left-0 bg-surface whitespace-nowrap">
                            {row.playerName}
                            <span className="text-[10px] text-text-muted ml-1">({row.position})</span>
                          </td>
                          <td className="p-2">
                            {matched ? (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle size={12} /> {getPlayerName(matched)}
                              </span>
                            ) : (
                              <span className="text-xs text-yellow-400 flex items-center gap-1">
                                <AlertTriangle size={12} /> Nenalezen
                              </span>
                            )}
                          </td>
                          {row.responses.map((resp, ci) => (
                            <td key={ci} className="text-center p-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${RESPONSE_COLORS[resp]}`}>
                                {RESPONSE_LABELS[resp]}
                              </span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ATTENDANCE STATS (TOP 6) ═══ */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-brand-red" /> TOP 6 — Docházka na tréninky
            </h3>
            {stats.slice(0, 6).map((s, i) => (
              <div key={s.player_id} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                <span className="text-sm text-text">
                  <span className="font-bold text-brand-red mr-1">{i + 1}.</span>
                  {getPlayerName(s.player_id)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-green-400">{s.jde}×</span>
                  <span className="text-xs text-red-400">{s.nejde}×</span>
                  <span className="text-sm font-bold text-brand-yellow">{s.attendance_rate}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3">
              <Users size={16} className="text-brand-red" /> Přehled všech hráčů
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {stats.map((s) => (
                <div key={s.player_id} className="flex justify-between items-center py-1 text-xs">
                  <span className="text-text">{getPlayerName(s.player_id)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">{s.jde}</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-red-400">{s.nejde}</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-gray-400">{s.neodpovedel}</span>
                    <span className={`font-bold ml-1 ${s.attendance_rate >= 70 ? "text-green-400" : s.attendance_rate >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                      {s.attendance_rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TRAININGS LIST ═══ */}
      <h2 className="text-xl font-bold text-text mb-4">Tréninky v sezóně {season}</h2>
      {loading ? (
        <p className="text-text-muted">Načítám...</p>
      ) : trainings.length === 0 ? (
        <p className="text-text-muted">Žádné tréninky v této sezóně. Importujte data z Excelu.</p>
      ) : (
        <div className="space-y-2">
          {trainings.map((t) => {
            const d = new Date(t.date);
            const isExpanded = expandedTraining === t.id;
            const attendees = t.training_attendance || [];
            const going = attendees.filter((a) => a.response === "jde").length;
            const notGoing = attendees.filter((a) => a.response === "nejde").length;
            const noResp = attendees.filter((a) => a.response === "neodpovedel").length;

            return (
              <div key={t.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-muted transition-colors"
                  onClick={() => setExpandedTraining(isExpanded ? null : t.id)}
                >
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    t.type === "zapas" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {t.type === "zapas" ? "Zápas" : "Trénink"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-text text-sm">{t.title}</span>
                    <span className="text-xs text-text-muted ml-2">
                      {d.toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })} {getHoursPrague(d) > 0 && formatTimePrague(d)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className="text-green-400 font-bold">{going}×</span>
                    <span className="text-red-400 font-bold">{notGoing}×</span>
                    <span className="text-gray-400">{noResp}×</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTraining(t.id); }}
                    className="text-red-500 hover:text-red-700 p-1.5 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 bg-surface-muted">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-green-400 uppercase mb-1">Jde ({going})</h4>
                        <div className="space-y-0.5">
                          {attendees.filter((a) => a.response === "jde").map((a) => (
                            <div key={a.player_id} className="text-xs text-text">{getPlayerName(a.player_id)}</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-red-400 uppercase mb-1">Nejde ({notGoing})</h4>
                        <div className="space-y-0.5">
                          {attendees.filter((a) => a.response === "nejde").map((a) => (
                            <div key={a.player_id} className="text-xs text-text">{getPlayerName(a.player_id)}</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Neodpověděl ({noResp})</h4>
                        <div className="space-y-0.5">
                          {attendees.filter((a) => a.response === "neodpovedel").map((a) => (
                            <div key={a.player_id} className="text-xs text-text">{getPlayerName(a.player_id)}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
