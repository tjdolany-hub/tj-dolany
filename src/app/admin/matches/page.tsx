"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Plus, Pencil, Trash2, Users, Target, ChevronDown, Save, X,
  BookOpen, Upload, UserPlus, RotateCcw, Square, AlertTriangle,
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
  const [activeTab, setActiveTab] = useState<"matches" | "draws">("matches");

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
  const [saving, setSaving] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  // ── Draw state ──
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawsLoading, setDrawsLoading] = useState(true);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawEditId, setDrawEditId] = useState<string | null>(null);
  const [drawForm, setDrawForm] = useState({ season: "2025/2026", title: "", active: true });
  const [drawImages, setDrawImages] = useState<{ url: string; alt?: string }[]>([]);
  const [drawSaving, setDrawSaving] = useState(false);

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

  // ── Match form logic ──

  const resetForm = () => {
    setForm(emptyForm);
    setLineup([]);
    setScorers([]);
    setCards([]);
    setEditId(null);
    setShowForm(false);
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
    setScorers(m.match_scorers?.map((s) => ({ player_id: s.player_id, goals: s.goals, minute: s.minute?.toString() ?? "" })) || []);
    setCards(m.match_cards?.map((c) => ({ player_id: c.player_id, card_type: c.card_type, minute: c.minute?.toString() ?? "" })) || []);
    setEditId(m.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const dateTime = form.time ? `${form.date}T${form.time}` : `${form.date}T00:00`;
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
      scorers: scorers.map((s) => ({
        player_id: s.player_id,
        goals: s.goals,
        minute: s.minute ? parseInt(s.minute) : null,
      })),
      cards: cards.map((c) => ({
        player_id: c.player_id,
        card_type: c.card_type,
        minute: c.minute ? parseInt(c.minute) : null,
      })),
    };

    const url = editId ? `/api/matches/${editId}` : "/api/matches";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { resetForm(); loadMatches(); }
    setSaving(false);
  };

  const deleteMatch = async (id: string) => {
    if (!confirm("Opravdu smazat tento zápas?")) return;
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    loadMatches();
  };

  const publishMatch = async (id: string) => {
    setPublishing(id);
    const res = await fetch(`/api/matches/${id}/publish`, { method: "POST" });
    if (res.ok) {
      loadMatches();
      alert("Zápas publikován do Aktualit");
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
    const ourScore = m.is_home ? m.score_home : m.score_away;
    const theirScore = m.is_home ? m.score_away : m.score_home;
    if (ourScore > theirScore) return { label: "V", color: "bg-green-500" };
    if (ourScore < theirScore) return { label: "P", color: "bg-red-500" };
    return { label: "R", color: "bg-yellow-500" };
  };

  // Filter matches by half
  const filteredMatches = half === "all" ? matches : matches.filter((m) => {
    const month = new Date(m.date).getMonth();
    return half === "podzim" ? month >= 7 : month < 7;
  });

  // ── Draw form logic ──

  const resetDrawForm = () => {
    setDrawForm({ season: "2025/2026", title: "", active: true });
    setDrawImages([]);
    setDrawEditId(null);
    setShowDrawForm(false);
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
    if (res.ok) { resetDrawForm(); loadDraws(); }
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
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas</label>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Soupeř</label>
                  <input type="text" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Sezóna</label>
                  <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red">
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Soutěž</label>
                  <input type="text" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Hřiště</label>
                  <input type="text" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_home} onChange={(e) => setForm({ ...form, is_home: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-text">Hrajeme doma</span>
                  </label>
                </div>
              </div>

              {/* Score */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Skóre domácí</label>
                  <input type="number" min={0} value={form.score_home} onChange={(e) => setForm({ ...form, score_home: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Skóre hosté</label>
                  <input type="number" min={0} value={form.score_away} onChange={(e) => setForm({ ...form, score_away: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Poločas domácí</label>
                  <input type="number" min={0} value={form.halftime_home} onChange={(e) => setForm({ ...form, halftime_home: e.target.value })}
                    placeholder="—" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Poločas hosté</label>
                  <input type="number" min={0} value={form.halftime_away} onChange={(e) => setForm({ ...form, halftime_away: e.target.value })}
                    placeholder="—" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
              </div>

              {/* Lineup */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm font-bold text-text flex items-center gap-2">
                    <Users size={16} className="text-brand-red" /> Sestava ({lineup.length} hráčů)
                  </p>
                  <button type="button" onClick={fillAllActive} className="text-xs text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
                    <UserPlus size={12} /> Všichni aktivní
                  </button>
                  <button type="button" onClick={fillFromPrevious} className="text-xs text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
                    <RotateCcw size={12} /> Z předchozího
                  </button>
                </div>
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
                            return (
                              <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                                inLineup
                                  ? "border-brand-red bg-brand-red/10 text-text font-medium"
                                  : "border-border text-text-muted hover:border-brand-red/30"
                              } ${!p.active ? "opacity-50" : ""}`}>
                                <input type="checkbox" checked={!!inLineup} onChange={() => toggleLineup(p.id, true)} className="w-3.5 h-3.5 accent-brand-red" />
                                <span className="flex-1 truncate">{p.name}</span>
                                {inLineup && (
                                  <button type="button" onClick={() => setStarterStatus(p.id, !inLineup.is_starter)}
                                    title={inLineup.is_starter ? "Základní sestava" : "Střídající"}
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${inLineup.is_starter ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                    {inLineup.is_starter ? "ZS" : "ST"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scorers */}
              <div>
                <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                  <Target size={16} className="text-brand-red" /> Střelci
                </p>
                {scorers.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={s.player_id} onChange={(e) => { const u = [...scorers]; u[i] = { ...u[i], player_id: e.target.value }; setScorers(u); }}
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
                      <option value="">Vyber hráče</option>
                      {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min={1} value={s.goals} onChange={(e) => { const u = [...scorers]; u[i] = { ...u[i], goals: parseInt(e.target.value) || 1 }; setScorers(u); }}
                      className="w-16 px-2 py-2 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Góly" />
                    <input type="number" min={1} max={120} value={s.minute} onChange={(e) => { const u = [...scorers]; u[i] = { ...u[i], minute: e.target.value }; setScorers(u); }}
                      className="w-16 px-2 py-2 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Min" />
                    <button type="button" onClick={() => setScorers(scorers.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-2"><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setScorers([...scorers, { player_id: "", goals: 1, minute: "" }])}
                  className="text-sm text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
                  <Plus size={14} /> Přidat střelce
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
                <input type="text" value={form.summary_title} onChange={(e) => setForm({ ...form, summary_title: e.target.value })}
                  placeholder="např. Vydařený zápas na domácím hřišti"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red mb-2" />
                <label className="block text-sm font-semibold text-text mb-1">Referát / komentář</label>
                <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" />
              </div>

              <button type="submit" disabled={saving}
                className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
                <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
              </button>
            </form>
          )}

          {/* Match list */}
          {loading ? (
            <p className="text-text-muted">Načítám...</p>
          ) : (
            <div className="space-y-2">
              {filteredMatches.map((m) => {
                const result = getResult(m);
                const d = new Date(m.date);
                const isExpanded = expandedMatch === m.id;
                return (
                  <div key={m.id} className="bg-surface rounded-xl border border-border overflow-hidden">
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
                          <span className="font-bold text-text">
                            {m.score_home}:{m.score_away}
                            {m.halftime_home != null && m.halftime_away != null && (
                              <span className="text-text-muted font-normal text-xs ml-1">({m.halftime_home}:{m.halftime_away})</span>
                            )}
                          </span>
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
                        <button onClick={(e) => { e.stopPropagation(); publishMatch(m.id); }} disabled={publishing === m.id}
                          title="Publikovat do Aktualit"
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
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-1 mt-2">Střídající</h4>
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
                              {m.match_scorers.map((s, i) => (
                                <span key={i} className="text-xs bg-brand-red/10 text-brand-red px-2 py-1 rounded font-medium">
                                  {s.players?.name || "?"} ({s.goals}{s.minute ? `, ${s.minute}'` : ""})
                                </span>
                              ))}
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
                  <select value={drawForm.season} onChange={(e) => setDrawForm({ ...drawForm, season: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text">
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Název</label>
                  <input type="text" value={drawForm.title} onChange={(e) => setDrawForm({ ...drawForm, title: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={drawForm.active} onChange={(e) => setDrawForm({ ...drawForm, active: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-text">Aktivní</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Obrázek</label>
                <ImageUploader images={drawImages} onChange={setDrawImages} folder="draws" multiple={false} />
              </div>
              <button type="submit" disabled={drawSaving}
                className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                <Save size={16} /> {drawSaving ? "Ukládám..." : "Uložit"}
              </button>
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
    </div>
  );
}
