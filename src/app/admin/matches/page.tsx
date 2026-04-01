"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";
import { formatDateShort } from "@/lib/utils";

interface MatchResult {
  id: string;
  date: string;
  opponent: string;
  score_home: number;
  score_away: number;
  is_home: boolean;
  competition: string | null;
  summary: string | null;
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", opponent: "", score_home: "0", score_away: "0", is_home: true, competition: "", summary: "" });
  const [saving, setSaving] = useState(false);

  const loadMatches = () => { fetch("/api/matches").then((r) => r.json()).then(setMatches).finally(() => setLoading(false)); };
  useEffect(() => { loadMatches(); }, []);

  const resetForm = () => { setForm({ date: "", opponent: "", score_home: "0", score_away: "0", is_home: true, competition: "", summary: "" }); setEditId(null); setShowForm(false); };

  const startEdit = (m: MatchResult) => {
    setForm({
      date: m.date.slice(0, 10),
      opponent: m.opponent,
      score_home: m.score_home.toString(),
      score_away: m.score_away.toString(),
      is_home: m.is_home,
      competition: m.competition || "",
      summary: m.summary || "",
    });
    setEditId(m.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      date: form.date,
      opponent: form.opponent,
      score_home: parseInt(form.score_home),
      score_away: parseInt(form.score_away),
      is_home: form.is_home,
      competition: form.competition || null,
      summary: form.summary || null,
    };
    const url = editId ? `/api/matches/${editId}` : "/api/matches";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { resetForm(); loadMatches(); }
    setSaving(false);
  };

  const deleteMatch = async (id: string) => { if (!confirm("Opravdu smazat?")) return; await fetch(`/api/matches/${id}`, { method: "DELETE" }); loadMatches(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Výsledky zápasů</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"><Plus size={16} /> Přidat zápas</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
          <h2 className="text-xl font-bold text-text">{editId ? "Upravit zápas" : "Nový zápas"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-semibold text-text mb-1">Datum</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
            <div><label className="block text-sm font-semibold text-text mb-1">Soupeř</label><input type="text" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} required className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
            <div><label className="block text-sm font-semibold text-text mb-1">Soutěž</label><input type="text" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" placeholder="Okresní přebor" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-semibold text-text mb-1">Skóre domácí</label><input type="number" min="0" value={form.score_home} onChange={(e) => setForm({ ...form, score_home: e.target.value })} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
            <div><label className="block text-sm font-semibold text-text mb-1">Skóre hosté</label><input type="number" min="0" value={form.score_away} onChange={(e) => setForm({ ...form, score_away: e.target.value })} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer pb-2"><input type="checkbox" checked={form.is_home} onChange={(e) => setForm({ ...form, is_home: e.target.checked })} className="w-4 h-4" /><span className="text-sm font-semibold text-text">Domácí zápas</span></label></div>
          </div>
          <div><label className="block text-sm font-semibold text-text mb-1">Poznámka</label><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {saving ? "Ukládám..." : "Uložit"}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2 text-text hover:bg-surface-muted"><X size={16} /> Zrušit</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-text-muted">Načítám...</p> : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted"><tr><th className="text-left p-3 font-semibold text-text">Datum</th><th className="text-left p-3 font-semibold text-text">Zápas</th><th className="text-center p-3 font-semibold text-text">Skóre</th><th className="text-left p-3 font-semibold text-text hidden md:table-cell">Soutěž</th><th className="text-right p-3 font-semibold text-text">Akce</th></tr></thead>
            <tbody>
              {matches.map((m) => {
                const isWin = m.is_home ? m.score_home > m.score_away : m.score_away > m.score_home;
                const isDraw = m.score_home === m.score_away;
                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-3 text-text-muted whitespace-nowrap">{formatDateShort(m.date)}</td>
                    <td className="p-3 text-text font-medium">{m.is_home ? "TJ Dolany" : m.opponent} vs. {m.is_home ? m.opponent : "TJ Dolany"}</td>
                    <td className="p-3 text-center"><span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${isWin ? "bg-green-100 text-green-700" : isDraw ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{m.score_home}:{m.score_away}</span></td>
                    <td className="p-3 text-text-muted hidden md:table-cell">{m.competition || "—"}</td>
                    <td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => startEdit(m)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button><button onClick={() => deleteMatch(m.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button></div></td>
                  </tr>
                );
              })}
              {matches.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-text-muted">Zatím žádné zápasy</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
