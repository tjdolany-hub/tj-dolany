"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Plus, Pencil, Trash2, Users, Target, ChevronDown, Save, X, Eye,
  BookOpen, Upload, UserPlus, RotateCcw, Square, AlertTriangle, Camera, CheckCircle,
} from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";

// ─── Types ───────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  position: string;
  active: boolean;
}

interface ScorerEntry {
  player_id: string;
  goals: number;
  minute: number | null;
  players?: { id: string; name: string };
}

interface LineupEntry {
  player_id: string;
  is_starter: boolean;
  players?: { id: string; name: string };
}

interface CardEntry {
  player_id: string;
  card_type: "yellow" | "red";
  minute: number | null;
  players?: { id: string; name: string };
}

interface Match {
  id: string;
  date: string;
  opponent: string;
  score_home: number;
  score_away: number;
  is_home: boolean;
  competition: string | null;
  season: string | null;
  summary: string | null;
  summary_title: string | null;
  halftime_home: number | null;
  halftime_away: number | null;
  venue: string | null;
  article_id: string | null;
  match_lineups?: LineupEntry[];
  match_scorers?: ScorerEntry[];
  match_cards?: CardEntry[];
  match_images?: { url: string; alt: string | null }[];
}

interface Draw {
  id: string;
  season: string;
  title: string;
  image: string;
  active: boolean;
}

// ─── Constants ───────────────────────────────────────────────

const SEASONS = ["2025/2026", "2024/2025", "2023/2024"];

const emptyForm = {
  date: "",
  time: "",
  opponent: "",
  score_home: 0,
  score_away: 0,
  halftime_home: "",
  halftime_away: "",
  is_home: true,
  competition: "Okresní přebor",
  season: "2025/2026",
  venue: "Dolany",
  summary_title: "",
  summary: "",
};

// ─── Component ───────────────────────────────────────────────

export default function AdminMatchesPage() {
  const [activeTab, setActiveTab] = useState<"matches" | "draws" | "standings">("matches");

  // ── Match state ──
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState("2025/2026");
  const [half, setHalf] = useState<"all" | "podzim" | "jaro">("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [lineup, setLineup] = useState<{ player_id: string; is_starter: boolean }[]>([]);
  const [scorers, setScorers] = useState<{ player_id: string; goals: number; minute: string }[]>([]);
  const [cards, setCards] = useState<{ player_id: string; card_type: "yellow" | "red"; minute: string }[]>([]);
  const [matchImages, setMatchImages] = useState<{ url: string; alt?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  // ── Standings state ──
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
  const [standingsData, setStandingsData] = useState<Record<StandingsVariant, Standing[]>>({ celkem: [], doma: [], venku: [] });
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsSaving, setStandingsSaving] = useState(false);
  const [standingsSeason, setStandingsSeason] = useState("2025/2026");
  const [standingsPreviewVariant, setStandingsPreviewVariant] = useState<StandingsVariant>("celkem");
  const [standingsText, setStandingsText] = useState("");

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

  // ── Draw state ──
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawsLoading, setDrawsLoading] = useState(true);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawEditId, setDrawEditId] = useState<string | null>(null);
  const [drawForm, setDrawForm] = useState({ season: "2025/2026", title: "", active: true });
  const [drawImages, setDrawImages] = useState<{ url: string; alt?: string }[]>([]);
  const [drawSaving, setDrawSaving] = useState(false);
  const [drawSaved, setDrawSaved] = useState(false);

  // ── Load data ──

  const loadMatches = useCallback(() => {
    setLoading(true);
    fetch(`/api/matches?season=${encodeURIComponent(season)}`)
      .then((r) => r.json())
      .then((data) => setMatches(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [season]);

  const loadDraws = useCallback(() => {
    setDrawsLoading(true);
    fetch("/api/draws")
      .then((r) => r.json())
      .then((data) => setDraws(Array.isArray(data) ? data : []))
      .finally(() => setDrawsLoading(false));
  }, []);

  useEffect(() => {
    loadMatches();
    fetch("/api/players").then((r) => r.json()).then((d) => setPlayers(Array.isArray(d) ? d : []));
  }, [loadMatches]);

  useEffect(() => {
    loadDraws();
  }, [loadDraws]);

  const loadStandings = useCallback(() => {
    setStandingsLoading(true);
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
      })
      .finally(() => setStandingsLoading(false));
  }, [standingsSeason]);

  useEffect(() => {
    if (activeTab === "standings") loadStandings();
  }, [activeTab, loadStandings]);

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

  // ── Match form logic ──

  const resetForm = () => {
    setForm(emptyForm);
    setLineup([]);
    setScorers([]);
    setCards([]);
    setMatchImages([]);
    setEditId(null);
    setShowForm(false);
    setSaved(false);
  };

  const updateMatchForm = (patch: Partial<typeof form>) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const startEdit = (m: Match) => {
    const d = new Date(m.date);
    setForm({
      date: m.date.slice(0, 10),
      time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
      opponent: m.opponent,
      score_home: m.score_home,
      score_away: m.score_away,
      halftime_home: m.halftime_home?.toString() ?? "",
      halftime_away: m.halftime_away?.toString() ?? "",
      is_home: m.is_home,
      competition: m.competition || "Okresní přebor",
      season: m.season || "2025/2026",
      venue: m.venue || "Dolany",
      summary_title: m.summary_title || "",
      summary: m.summary || "",
    });
    setLineup(m.match_lineups?.map((l) => ({ player_id: l.player_id, is_starter: l.is_starter })) || []);
    // Expand each scorer entry into individual goal rows (1 per goal) for editing
    const expandedScorers: { player_id: string; goals: number; minute: string }[] = [];
    (m.match_scorers || []).forEach((s) => {
      if (s.goals > 1 && !s.minute) {
        // Legacy: single row with goals count, no minute — keep as one row
        expandedScorers.push({ player_id: s.player_id, goals: s.goals, minute: "" });
      } else {
        // One row per goal
        for (let g = 0; g < s.goals; g++) {
          expandedScorers.push({ player_id: s.player_id, goals: 1, minute: g === 0 && s.minute ? s.minute.toString() : "" });
        }
      }
    });
    setScorers(expandedScorers);
    setCards(m.match_cards?.map((c) => ({ player_id: c.player_id, card_type: c.card_type, minute: c.minute?.toString() ?? "" })) || []);
    setMatchImages(m.match_images?.map((img) => ({ url: img.url, alt: img.alt ?? undefined })) || []);
    setEditId(m.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Build date as local time → convert to ISO so Supabase stores correct UTC
    const dateTime = form.time
      ? new Date(`${form.date}T${form.time}`).toISOString()
      : new Date(`${form.date}T00:00`).toISOString();
    const body = {
      date: dateTime,
      opponent: form.opponent,
      score_home: form.score_home,
      score_away: form.score_away,
      halftime_home: form.halftime_home ? parseInt(form.halftime_home) : null,
      halftime_away: form.halftime_away ? parseInt(form.halftime_away) : null,
      is_home: form.is_home,
      competition: form.competition,
      season: form.season,
      venue: form.venue || null,
      summary_title: form.summary_title || null,
      summary: form.summary || null,
      lineup,
      // Each row = 1 goal; same player can appear multiple times
      scorers: scorers.filter((s) => s.player_id).map((s) => ({
        player_id: s.player_id,
        goals: 1,
        minute: s.minute ? parseInt(s.minute) : null,
      })),
      cards: cards.map((c) => ({
        player_id: c.player_id,
        card_type: c.card_type,
        minute: c.minute ? parseInt(c.minute) : null,
      })),
      images: matchImages.map((img) => ({ url: img.url, alt: img.alt || null })),
    };

    const url = editId ? `/api/matches/${editId}` : "/api/matches";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      if (editId) { setSaved(true); } else { resetForm(); }
      loadMatches();
    }
    setSaving(false);
  };

  const deleteMatch = async (id: string) => {
    if (!confirm("Opravdu smazat tento zápas?")) return;
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    loadMatches();
  };

  const publishMatch = async (id: string, published = true) => {
    setPublishing(id);
    const res = await fetch(`/api/matches/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published }),
    });
    if (res.ok) {
      loadMatches();
      alert(published ? "Zápas publikován do Aktualit" : "Článek uložen jako koncept");
    }
    setPublishing(null);
  };

  // Lineup helpers
  const toggleLineup = (playerId: string, starter: boolean) => {
    setLineup((prev) => {
      const existing = prev.find((l) => l.player_id === playerId);
      if (existing) {
        return prev.filter((l) => l.player_id !== playerId);
      }
      return [...prev, { player_id: playerId, is_starter: starter }];
    });
  };

  const setStarterStatus = (playerId: string, isStarter: boolean) => {
    setLineup((prev) => prev.map((l) => l.player_id === playerId ? { ...l, is_starter: isStarter } : l));
  };

  const fillAllActive = () => {
    const activePlayers = players.filter((p) => p.active);
    setLineup(activePlayers.map((p) => ({ player_id: p.id, is_starter: true })));
  };

  const fillFromPrevious = () => {
    // Find most recent match before current edit
    const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const prev = sorted.find((m) => m.id !== editId && m.match_lineups && m.match_lineups.length > 0);
    if (prev?.match_lineups) {
      setLineup(prev.match_lineups.map((l) => ({ player_id: l.player_id, is_starter: l.is_starter })));
    }
  };

  const getResult = (m: Match) => {
    if (!isMatchPlayed(m)) return { label: "?", color: "bg-gray-400" };
    const ourScore = m.is_home ? m.score_home : m.score_away;
    const theirScore = m.is_home ? m.score_away : m.score_home;
    if (ourScore > theirScore) return { label: "V", color: "bg-green-500" };
    if (ourScore < theirScore) return { label: "P", color: "bg-red-500" };
    return { label: "R", color: "bg-yellow-500" };
  };

  // Filter matches by half, sort ascending (oldest first)
  const filteredMatches = (half === "all" ? matches : matches.filter((m) => {
    const month = new Date(m.date).getMonth();
    return half === "podzim" ? month >= 7 : month < 7;
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const isMatchPlayed = (m: Match) => new Date(m.date) <= new Date();

  // ── Draw form logic ──

  const resetDrawForm = () => {
    setDrawForm({ season: "2025/2026", title: "", active: true });
    setDrawImages([]);
    setDrawEditId(null);
    setShowDrawForm(false);
    setDrawSaved(false);
  };

  const startDrawEdit = (d: Draw) => {
    setDrawForm({ season: d.season, title: d.title, active: d.active });
    setDrawImages([{ url: d.image }]);
    setDrawEditId(d.id);
    setShowDrawForm(true);
  };

  const handleDrawSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!drawImages[0]?.url) return;
    setDrawSaving(true);
    const body = { ...drawForm, image: drawImages[0].url };
    const url = drawEditId ? `/api/draws/${drawEditId}` : "/api/draws";
    const method = drawEditId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      if (drawEditId) { setDrawSaved(true); } else { resetDrawForm(); }
      loadDraws();
    }
    setDrawSaving(false);
  };

  const deleteDraw = async (id: string) => {
    if (!confirm("Opravdu smazat tento los?")) return;
    await fetch(`/api/draws/${id}`, { method: "DELETE" });
    loadDraws();
  };

  // ── Stats ──
  const playerStats = new Map<string, { name: string; matches: number; goals: number }>();
  matches.forEach((m) => {
    m.match_lineups?.forEach((l) => {
      const name = l.players?.name || "?";
      const existing = playerStats.get(l.player_id) || { name, matches: 0, goals: 0 };
      existing.matches++;
      playerStats.set(l.player_id, existing);
    });
    m.match_scorers?.forEach((s) => {
      const name = s.players?.name || "?";
      const existing = playerStats.get(s.player_id) || { name, matches: 0, goals: 0 };
      existing.goals += s.goals;
      playerStats.set(s.player_id, existing);
    });
  });

  const topScorers = [...playerStats.values()].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 5);
  const topAppearances = [...playerStats.values()].filter((s) => s.matches > 0).sort((a, b) => b.matches - a.matches).slice(0, 5);

  // ── Render ──

  return (
    <div>
      <h1 className="text-3xl font-bold text-text mb-6">Zápasy</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-3">
        <button onClick={() => setActiveTab("matches")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "matches" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"}`}>
          Zápasy
        </button>
        <button onClick={() => setActiveTab("draws")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "draws" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"}`}>
          Losy soutěže
        </button>
        <button onClick={() => setActiveTab("standings")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "standings" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"}`}>
          Tabulka
        </button>
      </div>

      {/* ═══ MATCHES TAB ═══ */}
      {activeTab === "matches" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              {SEASONS.map((s) => (
                <button key={s} onClick={() => setSeason(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${season === s ? "bg-brand-red text-white" : "bg-surface border border-border text-text-muted hover:text-text"}`}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
              <Plus size={16} /> Nový zápas
            </button>
          </div>

          {/* Half filter */}
          <div className="flex gap-2 mb-6">
            {([["all", "Vše"], ["podzim", "Podzim"], ["jaro", "Jaro"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setHalf(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${half === val ? "bg-brand-yellow text-brand-dark" : "bg-surface border border-border text-text-muted"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Stats */}
          {(topScorers.length > 0 || topAppearances.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {topScorers.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3"><Target size={16} className="text-brand-red" /> TOP střelci</h3>
                  {topScorers.map((s, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                      <span className="text-sm text-text">{i + 1}. {s.name}</span>
                      <span className="text-sm font-bold text-brand-red">{s.goals} gólů</span>
                    </div>
                  ))}
                </div>
              )}
              {topAppearances.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3"><Users size={16} className="text-brand-red" /> TOP zápasy</h3>
                  {topAppearances.map((s, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                      <span className="text-sm text-text">{i + 1}. {s.name}</span>
                      <span className="text-sm font-bold text-brand-red">{s.matches} zápasů</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Match form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">{editId ? "Upravit zápas" : "Nový zápas"}</h2>
                <button type="button" onClick={resetForm} className="text-text-muted hover:text-text"><X size={20} /></button>
              </div>

              {/* Basic fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Datum</label>
                  <input type="date" value={form.date} onChange={(e) => updateMatchForm({ date: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas</label>
                  <input type="time" value={form.time} onChange={(e) => updateMatchForm({ time: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Soupeř</label>
                  <input type="text" value={form.opponent} onChange={(e) => updateMatchForm({ opponent: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Sezóna</label>
                  <select value={form.season} onChange={(e) => updateMatchForm({ season: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red">
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Soutěž</label>
                  <input type="text" value={form.competition} onChange={(e) => updateMatchForm({ competition: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Hřiště</label>
                  <input type="text" value={form.venue} onChange={(e) => updateMatchForm({ venue: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_home} onChange={(e) => updateMatchForm({ is_home: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-text">Hrajeme doma</span>
                  </label>
                </div>
              </div>

              {/* Score */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Skóre domácí</label>
                  <input type="number" min={0} value={form.score_home} onChange={(e) => updateMatchForm({ score_home: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Skóre hosté</label>
                  <input type="number" min={0} value={form.score_away} onChange={(e) => updateMatchForm({ score_away: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Poločas domácí</label>
                  <input type="number" min={0} value={form.halftime_home} onChange={(e) => updateMatchForm({ halftime_home: e.target.value })}
                    placeholder="—" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Poločas hosté</label>
                  <input type="number" min={0} value={form.halftime_away} onChange={(e) => updateMatchForm({ halftime_away: e.target.value })}
                    placeholder="—" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
              </div>

              {/* Lineup */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm font-bold text-text flex items-center gap-2">
                    <Users size={16} className="text-brand-red" /> Sestava ({lineup.length} hráčů — {lineup.filter((l) => l.is_starter).length} ZS, {lineup.filter((l) => !l.is_starter).length} N)
                  </p>
                  <button type="button" onClick={fillAllActive} className="text-xs text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
                    <UserPlus size={12} /> Všichni aktivní
                  </button>
                  <button type="button" onClick={fillFromPrevious} className="text-xs text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
                    <RotateCcw size={12} /> Z předchozího
                  </button>
                </div>
                <p className="text-xs text-text-muted mb-3">ZS = základní sestava, N = náhradník. Zápas se počítá všem zaškrtnutým.</p>

                <div className="space-y-3">
                  {[
                    { pos: "brankar", label: "Brankáři", dot: "bg-yellow-500" },
                    { pos: "obrance", label: "Obránci", dot: "bg-blue-500" },
                    { pos: "zaloznik", label: "Záložníci", dot: "bg-green-500" },
                    { pos: "utocnik", label: "Útočníci", dot: "bg-red-500" },
                  ].map(({ pos, label, dot }) => {
                    const posPlayers = players.filter((p) => p.position === pos);
                    if (posPlayers.length === 0) return null;
                    return (
                      <div key={pos}>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${dot}`} /> {label}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {posPlayers.map((p) => {
                            const inLineup = lineup.find((l) => l.player_id === p.id);
                            const isStarter = inLineup?.is_starter;
                            const isBench = inLineup && !inLineup.is_starter;
                            return (
                              <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                                isStarter
                                  ? "border-green-500 bg-green-600/20 font-medium"
                                  : isBench
                                    ? "border-orange-400 bg-orange-500/20 font-medium"
                                    : "border-border hover:border-brand-red/30"
                              } ${!p.active ? "opacity-50" : ""}`}>
                                <span className="flex-1 truncate text-text">{p.name}</span>
                                <label className={`flex items-center gap-1 cursor-pointer text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isStarter ? "bg-green-600/30 text-green-400" : "text-text-muted hover:text-green-400"
                                }`} title="Základní sestava">
                                  <input type="checkbox" checked={!!isStarter} onChange={() => {
                                    if (isStarter) { toggleLineup(p.id, true); }
                                    else if (isBench) { setStarterStatus(p.id, true); }
                                    else { toggleLineup(p.id, true); }
                                  }} className="w-3 h-3 accent-green-500" />
                                  ZS
                                </label>
                                <label className={`flex items-center gap-1 cursor-pointer text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isBench ? "bg-orange-500/30 text-orange-400" : "text-text-muted hover:text-orange-400"
                                }`} title="Náhradník">
                                  <input type="checkbox" checked={!!isBench} onChange={() => {
                                    if (isBench) { toggleLineup(p.id, false); }
                                    else if (isStarter) { setStarterStatus(p.id, false); }
                                    else { toggleLineup(p.id, false); }
                                  }} className="w-3 h-3 accent-orange-500" />
                                  N
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scorers — each row = 1 goal, same player can appear multiple times */}
              <div>
                <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                  <Target size={16} className="text-brand-red" /> Góly
                  <span className="text-xs font-normal text-text-muted">(každý řádek = 1 gól, hráč může být vícekrát)</span>
                </p>
                {scorers.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={s.player_id} onChange={(e) => { const u = [...scorers]; u[i] = { ...u[i], player_id: e.target.value }; setScorers(u); }}
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
                      <option value="">Vyber hráče</option>
                      {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min={1} max={120} value={s.minute} onChange={(e) => { const u = [...scorers]; u[i] = { ...u[i], minute: e.target.value }; setScorers(u); }}
                      className="w-20 px-2 py-2 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Min." />
                    <button type="button" onClick={() => setScorers(scorers.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-2"><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setScorers([...scorers, { player_id: "", goals: 1, minute: "" }])}
                  className="text-sm text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
                  <Plus size={14} /> Přidat gól
                </button>
              </div>

              {/* Cards */}
              <div>
                <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                  <Square size={16} className="text-yellow-500" /> Karty
                </p>
                {cards.map((c, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={c.player_id} onChange={(e) => { const u = [...cards]; u[i] = { ...u[i], player_id: e.target.value }; setCards(u); }}
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
                      <option value="">Vyber hráče</option>
                      {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={c.card_type} onChange={(e) => { const u = [...cards]; u[i] = { ...u[i], card_type: e.target.value as "yellow" | "red" }; setCards(u); }}
                      className="w-28 px-2 py-2 bg-surface border border-border rounded-lg text-text text-sm">
                      <option value="yellow">Žlutá</option>
                      <option value="red">Červená</option>
                    </select>
                    <input type="number" min={1} max={120} value={c.minute} onChange={(e) => { const u = [...cards]; u[i] = { ...u[i], minute: e.target.value }; setCards(u); }}
                      className="w-16 px-2 py-2 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Min" />
                    <button type="button" onClick={() => setCards(cards.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-2"><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setCards([...cards, { player_id: "", card_type: "yellow", minute: "" }])}
                  className="text-sm text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
                  <Plus size={14} /> Přidat kartu
                </button>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Nadpis referátu</label>
                <input type="text" value={form.summary_title} onChange={(e) => updateMatchForm({ summary_title: e.target.value })}
                  placeholder="např. Vydařený zápas na domácím hřišti"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red mb-2" />
                <label className="block text-sm font-semibold text-text mb-1">Referát / komentář</label>
                <textarea value={form.summary} onChange={(e) => updateMatchForm({ summary: e.target.value })} rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" />
              </div>

              {/* Photos */}
              <div>
                <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                  <Camera size={16} className="text-brand-red" /> Fotogalerie
                  <span className="text-xs font-normal text-text-muted">(automaticky převedeno na WebP)</span>
                </p>
                <ImageUploader images={matchImages} onChange={setMatchImages} folder="matches" multiple={true} />
              </div>

              <div className="flex items-center gap-2">
                <button type="submit" disabled={saving}
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
                  <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
                </button>
                <button type="button" onClick={resetForm}
                  className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                  <X size={16} /> Zrušit
                </button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-green-500 text-sm font-semibold ml-2">
                    <CheckCircle size={16} /> Uloženo
                  </span>
                )}
              </div>
            </form>
          )}

          {/* Match list */}
          {loading ? (
            <p className="text-text-muted">Načítám...</p>
          ) : (
            <div className="space-y-2">
              {filteredMatches.map((m) => {
                const played = isMatchPlayed(m);
                const result = getResult(m);
                const d = new Date(m.date);
                const isExpanded = expandedMatch === m.id;
                return (
                  <div key={m.id} className={`bg-surface rounded-xl border overflow-hidden ${!played ? "border-border border-dashed opacity-80" : "border-border"}`}>
                    <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-muted transition-colors"
                      onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
                      <span className={`${result.color} text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0`}>
                        {result.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-text text-sm">
                            {m.is_home ? `Dolany - ${m.opponent}` : `${m.opponent} - Dolany`}
                          </span>
                          {played ? (
                            <span className="font-bold text-text">
                              {m.score_home}:{m.score_away}
                              {m.halftime_home != null && m.halftime_away != null && (
                                <span className="text-text-muted font-normal text-xs ml-1">({m.halftime_home}:{m.halftime_away})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted italic">dosud nehráno</span>
                          )}
                        </div>
                        <span className="text-xs text-text-muted">
                          {d.toLocaleDateString("cs-CZ")} {d.getHours() > 0 && `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`} • {m.competition} {m.venue && `• ${m.venue}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {m.article_id && (
                          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded hidden sm:inline-flex items-center gap-1">
                            <BookOpen size={12} />
                          </span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); publishMatch(m.id, true); }} disabled={publishing === m.id}
                          title={m.article_id ? "Aktualizovat článek" : "Publikovat do Aktualit"}
                          className="text-blue-500 hover:text-blue-700 p-1.5 disabled:opacity-50">
                          <Upload size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(m); }} className="text-blue-600 hover:text-blue-800 p-1.5">
                          <Pencil size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteMatch(m.id); }} className="text-red-500 hover:text-red-700 p-1.5">
                          <Trash2 size={14} />
                        </button>
                        <ChevronDown size={16} className={`text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-surface-muted space-y-3">
                        {(m.summary_title || m.summary) && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Referát</h4>
                            {m.summary_title && (
                              <p className="text-sm font-bold text-text mb-1">{m.summary_title}</p>
                            )}
                            {m.summary && (
                              <p className="text-sm text-text whitespace-pre-wrap">{m.summary}</p>
                            )}
                          </div>
                        )}
                        {m.match_lineups && m.match_lineups.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Sestava</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {m.match_lineups.filter((l) => l.is_starter).map((l) => (
                                <span key={l.player_id} className="text-xs bg-surface px-2 py-1 rounded border border-border text-text">
                                  {l.players?.name || "?"}
                                </span>
                              ))}
                            </div>
                            {m.match_lineups.filter((l) => !l.is_starter).length > 0 && (
                              <>
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-1 mt-2">Náhradníci</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {m.match_lineups.filter((l) => !l.is_starter).map((l) => (
                                    <span key={l.player_id} className="text-xs bg-orange-50 px-2 py-1 rounded border border-orange-200 text-orange-700">
                                      {l.players?.name || "?"}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {m.match_scorers && m.match_scorers.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Střelci</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {/* Group by player, show individual minutes */}
                              {(() => {
                                const grouped = new Map<string, { name: string; minutes: (number | null)[] }>();
                                m.match_scorers!.forEach((s) => {
                                  const key = s.player_id;
                                  const existing = grouped.get(key);
                                  if (existing) {
                                    existing.minutes.push(s.minute);
                                  } else {
                                    grouped.set(key, { name: s.players?.name || "?", minutes: [s.minute] });
                                  }
                                });
                                return [...grouped.values()].map((g, i) => {
                                  const mins = g.minutes.filter((m): m is number => m != null).sort((a, b) => a - b);
                                  return (
                                    <span key={i} className="text-xs bg-brand-red/10 text-brand-red px-2 py-1 rounded font-medium">
                                      {g.name} ({g.minutes.length}×{mins.length > 0 ? ` — ${mins.map((m) => `${m}'`).join(", ")}` : ""})
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                        {m.match_cards && m.match_cards.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Karty</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {m.match_cards.map((c, i) => (
                                <span key={i} className={`text-xs px-2 py-1 rounded font-medium ${c.card_type === "yellow" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                                  {c.card_type === "yellow" ? "ŽK" : "ČK"} {c.players?.name || "?"}{c.minute ? ` (${c.minute}')` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredMatches.length === 0 && (
                <p className="text-center text-text-muted py-8">Žádné zápasy pro sezónu {season}</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ DRAWS TAB ═══ */}
      {activeTab === "draws" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text">Losy soutěže</h2>
            <button onClick={() => { resetDrawForm(); setShowDrawForm(true); }}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
              <Plus size={16} /> Nový los
            </button>
          </div>

          {showDrawForm && (
            <form onSubmit={handleDrawSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">{drawEditId ? "Upravit" : "Nový los"}</h2>
                <button type="button" onClick={resetDrawForm} className="text-text-muted hover:text-text"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Období</label>
                  <select value={drawForm.season} onChange={(e) => { setDrawSaved(false); setDrawForm({ ...drawForm, season: e.target.value }); }}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text">
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Název</label>
                  <input type="text" value={drawForm.title} onChange={(e) => { setDrawSaved(false); setDrawForm({ ...drawForm, title: e.target.value }); }} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={drawForm.active} onChange={(e) => { setDrawSaved(false); setDrawForm({ ...drawForm, active: e.target.checked }); }} className="w-4 h-4" />
                    <span className="text-sm text-text">Aktivní</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Obrázek</label>
                <ImageUploader images={drawImages} onChange={(imgs) => { setDrawSaved(false); setDrawImages(imgs); }} folder="draws" multiple={false} />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={drawSaving}
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                  <Save size={16} /> {drawSaving ? "Ukládám..." : "Uložit"}
                </button>
                <button type="button" onClick={resetDrawForm}
                  className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                  <X size={16} /> Zrušit
                </button>
                {drawSaved && (
                  <span className="flex items-center gap-1.5 text-green-500 text-sm font-semibold ml-2">
                    <CheckCircle size={16} /> Uloženo
                  </span>
                )}
              </div>
            </form>
          )}

          {drawsLoading ? (
            <p className="text-text-muted">Načítám...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draws.map((d) => (
                <div key={d.id} className="bg-surface rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs text-text-muted">{d.season}</span>
                      <h3 className="font-bold text-text">{d.title}</h3>
                    </div>
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${d.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {d.active ? "Aktivní" : "Skrytý"}
                      </span>
                      <button onClick={() => startDrawEdit(d)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={14} /></button>
                      <button onClick={() => deleteDraw(d.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-muted">
                    <Image src={d.image} alt={d.title} fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                  </div>
                </div>
              ))}
              {draws.length === 0 && <p className="text-text-muted col-span-2 text-center py-8">Žádné losy</p>}
            </div>
          )}
        </>
      )}
      {/* ═══ STANDINGS TAB ═══ */}
      {activeTab === "standings" && (
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
      )}
    </div>
  );
}
