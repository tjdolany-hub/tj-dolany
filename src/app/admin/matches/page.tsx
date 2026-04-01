"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Users, Target, ChevronDown, Save, X } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position: string;
}

interface ScorerEntry {
  player_id: string;
  goals: number;
  players?: { id: string; name: string };
}

interface LineupEntry {
  player_id: string;
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
  match_lineups?: LineupEntry[];
  match_scorers?: ScorerEntry[];
}

const SEASONS = ["2025/2026", "2024/2025", "2023/2024"];

const emptyForm = {
  date: "",
  opponent: "",
  score_home: 0,
  score_away: 0,
  is_home: true,
  competition: "Okresní přebor",
  season: "2025/2026",
  summary: "",
};

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState("2025/2026");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [lineup, setLineup] = useState<string[]>([]);
  const [scorers, setScorers] = useState<{ player_id: string; goals: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const loadMatches = useCallback(() => {
    setLoading(true);
    fetch(`/api/matches?season=${encodeURIComponent(season)}`)
      .then((r) => r.json())
      .then((data) => setMatches(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [season]);

  useEffect(() => {
    loadMatches();
    fetch("/api/players").then((r) => r.json()).then((d) => setPlayers(Array.isArray(d) ? d : []));
  }, [loadMatches]);

  const resetForm = () => {
    setForm(emptyForm);
    setLineup([]);
    setScorers([]);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (m: Match) => {
    setForm({
      date: m.date.slice(0, 16),
      opponent: m.opponent,
      score_home: m.score_home,
      score_away: m.score_away,
      is_home: m.is_home,
      competition: m.competition || "Okresní přebor",
      season: m.season || "2025/2026",
      summary: m.summary || "",
    });
    setLineup(m.match_lineups?.map((l) => l.player_id) || []);
    setScorers(m.match_scorers?.map((s) => ({ player_id: s.player_id, goals: s.goals })) || []);
    setEditId(m.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const body = { ...form, lineup, scorers };
    const url = editId ? `/api/matches/${editId}` : "/api/matches";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      resetForm();
      loadMatches();
    }
    setSaving(false);
  };

  const deleteMatch = async (id: string) => {
    if (!confirm("Opravdu smazat tento zápas?")) return;
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    loadMatches();
  };

  const toggleLineup = (playerId: string) => {
    setLineup((prev) =>
      prev.includes(playerId) ? prev.filter((p) => p !== playerId) : [...prev, playerId]
    );
  };

  const addScorer = () => {
    setScorers([...scorers, { player_id: "", goals: 1 }]);
  };

  const updateScorer = (idx: number, field: string, value: string | number) => {
    const updated = [...scorers];
    updated[idx] = { ...updated[idx], [field]: value };
    setScorers(updated);
  };

  const removeScorer = (idx: number) => {
    setScorers(scorers.filter((_, i) => i !== idx));
  };

  const getResult = (m: Match) => {
    const ourScore = m.is_home ? m.score_home : m.score_away;
    const theirScore = m.is_home ? m.score_away : m.score_home;
    if (ourScore > theirScore) return { label: "V", color: "bg-green-500" };
    if (ourScore < theirScore) return { label: "P", color: "bg-red-500" };
    return { label: "R", color: "bg-yellow-500" };
  };

  // Compute stats
  const playerStats = new Map<string, { name: string; matches: number; goals: number; position: string }>();
  matches.forEach((m) => {
    m.match_lineups?.forEach((l) => {
      const name = l.players?.name || "?";
      const p = players.find((pl) => pl.id === l.player_id);
      const existing = playerStats.get(l.player_id) || { name, matches: 0, goals: 0, position: p?.position || "" };
      existing.matches++;
      playerStats.set(l.player_id, existing);
    });
    m.match_scorers?.forEach((s) => {
      const name = s.players?.name || "?";
      const p = players.find((pl) => pl.id === s.player_id);
      const existing = playerStats.get(s.player_id) || { name, matches: 0, goals: 0, position: p?.position || "" };
      existing.goals += s.goals;
      playerStats.set(s.player_id, existing);
    });
  });

  const topScorers = [...playerStats.values()]
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  const topAppearances = [...playerStats.values()]
    .filter((s) => s.matches > 0)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-text">Zápasy</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> Nový zápas
        </button>
      </div>

      {/* Season selector */}
      <div className="flex gap-2 mb-6">
        {SEASONS.map((s) => (
          <button
            key={s}
            onClick={() => setSeason(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              season === s
                ? "bg-brand-red text-white"
                : "bg-surface border border-border text-text-muted hover:text-text"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      {(topScorers.length > 0 || topAppearances.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {topScorers.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3">
                <Target size={16} className="text-brand-red" /> TOP střelci
              </h3>
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
              <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3">
                <Users size={16} className="text-brand-red" /> TOP zápasy
              </h3>
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

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">{editId ? "Upravit zápas" : "Nový zápas"}</h2>
            <button type="button" onClick={resetForm} className="text-text-muted hover:text-text"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Datum a čas</label>
              <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-semibold text-text mb-1">Domácí?</label>
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.is_home} onChange={(e) => setForm({ ...form, is_home: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-text">Hrajeme doma</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Soutěž</label>
              <input type="text" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Referát / komentář</label>
            <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" />
          </div>

          {/* Lineup */}
          <div>
            <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
              <Users size={16} className="text-brand-red" /> Sestava ({lineup.length} hráčů)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {players.filter((p) => p.position === "brankar").concat(
                players.filter((p) => p.position === "obrance"),
                players.filter((p) => p.position === "zaloznik"),
                players.filter((p) => p.position === "utocnik"),
              ).map((p) => (
                <label key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
                  lineup.includes(p.id)
                    ? "border-brand-red bg-brand-red/10 text-text font-medium"
                    : "border-border text-text-muted hover:border-brand-red/30"
                }`}>
                  <input type="checkbox" checked={lineup.includes(p.id)} onChange={() => toggleLineup(p.id)} className="hidden" />
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    p.position === "brankar" ? "bg-yellow-500" :
                    p.position === "obrance" ? "bg-blue-500" :
                    p.position === "zaloznik" ? "bg-green-500" : "bg-red-500"
                  }`} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          {/* Scorers */}
          <div>
            <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
              <Target size={16} className="text-brand-red" /> Střelci
            </p>
            {scorers.map((s, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select value={s.player_id} onChange={(e) => updateScorer(i, "player_id", e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red">
                  <option value="">Vyber hráče</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min={1} value={s.goals} onChange={(e) => updateScorer(i, "goals", parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" placeholder="Góly" />
                <button type="button" onClick={() => removeScorer(i)} className="text-red-500 hover:text-red-700 p-2"><X size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={addScorer} className="text-sm text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
              <Plus size={14} /> Přidat střelce
            </button>
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
          {matches.map((m) => {
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
                      <span className="font-bold text-text">{m.score_home}:{m.score_away}</span>
                    </div>
                    <span className="text-xs text-text-muted">
                      {d.toLocaleDateString("cs-CZ")} • {m.competition}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.match_lineups && m.match_lineups.length > 0 && (
                      <span className="text-xs text-text-muted bg-surface-muted px-2 py-1 rounded hidden sm:inline-flex items-center gap-1">
                        <Users size={12} />{m.match_lineups.length}
                      </span>
                    )}
                    {m.match_scorers && m.match_scorers.length > 0 && (
                      <span className="text-xs text-text-muted bg-surface-muted px-2 py-1 rounded hidden sm:inline-flex items-center gap-1">
                        <Target size={12} />{m.match_scorers.reduce((a, s) => a + s.goals, 0)}
                      </span>
                    )}
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
                    {m.summary && (
                      <div>
                        <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Referát</h4>
                        <p className="text-sm text-text whitespace-pre-wrap">{m.summary}</p>
                      </div>
                    )}
                    {m.match_lineups && m.match_lineups.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Sestava</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {m.match_lineups.map((l) => (
                            <span key={l.player_id} className="text-xs bg-surface px-2 py-1 rounded border border-border text-text">
                              {l.players?.name || "?"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.match_scorers && m.match_scorers.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Střelci</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {m.match_scorers.map((s) => (
                            <span key={s.player_id} className="text-xs bg-brand-red/10 text-brand-red px-2 py-1 rounded font-medium">
                              {s.players?.name || "?"} ({s.goals})
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
          {matches.length === 0 && (
            <p className="text-center text-text-muted py-8">Žádné zápasy pro sezónu {season}</p>
          )}
        </div>
      )}
    </div>
  );
}
