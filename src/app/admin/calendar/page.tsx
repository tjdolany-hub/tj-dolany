"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";
import { EVENT_TYPES, formatDateShort } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  event_type: string;
  location: string | null;
  is_public: boolean;
}

export default function AdminCalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", date: "", end_date: "", event_type: "akce", location: "", is_public: true });
  const [saving, setSaving] = useState(false);

  const loadEvents = () => {
    fetch(`/api/calendar?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setEvents)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEvents(); }, [month, year]);

  const resetForm = () => {
    setForm({ title: "", description: "", date: "", end_date: "", event_type: "akce", location: "", is_public: true });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (e: CalendarEvent) => {
    setForm({
      title: e.title,
      description: e.description || "",
      date: e.date.slice(0, 16),
      end_date: e.end_date ? e.end_date.slice(0, 16) : "",
      event_type: e.event_type,
      location: e.location || "",
      is_public: e.is_public,
    });
    setEditId(e.id);
    setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    const body = { ...form, end_date: form.end_date || null, description: form.description || null, location: form.location || null };
    const url = editId ? `/api/calendar/${editId}` : "/api/calendar";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { resetForm(); loadEvents(); }
    setSaving(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Opravdu smazat?")) return;
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    loadEvents();
  };

  const typeLabel = (val: string) => EVENT_TYPES.find((t) => t.value === val)?.label || val;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Kalendář</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
          <Plus size={16} /> Přidat událost
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="px-3 py-2 bg-surface border border-border rounded-lg text-text">
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-2 bg-surface border border-border rounded-lg text-text w-24" />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
          <h2 className="text-xl font-bold text-text">{editId ? "Upravit" : "Nová událost"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-text mb-1">Název</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
            <div><label className="block text-sm font-semibold text-text mb-1">Typ</label><select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text">{EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-text mb-1">Datum</label><input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
            <div><label className="block text-sm font-semibold text-text mb-1">Konec</label><input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
          </div>
          <div><label className="block text-sm font-semibold text-text mb-1">Místo</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
          <div><label className="block text-sm font-semibold text-text mb-1">Popis</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="w-4 h-4" /><span className="text-sm font-semibold text-text">Veřejná</span></label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {saving ? "Ukládám..." : "Uložit"}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2 text-text hover:bg-surface-muted"><X size={16} /> Zrušit</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-text-muted">Načítám...</p> : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted"><tr><th className="text-left p-3 font-semibold text-text">Datum</th><th className="text-left p-3 font-semibold text-text">Název</th><th className="text-left p-3 font-semibold text-text">Typ</th><th className="text-right p-3 font-semibold text-text">Akce</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3 text-text-muted whitespace-nowrap">{formatDateShort(e.date)}</td>
                  <td className="p-3 text-text font-medium">{e.title}</td>
                  <td className="p-3 text-text-muted">{typeLabel(e.event_type)}</td>
                  <td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => startEdit(e)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button><button onClick={() => deleteEvent(e.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button></div></td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-text-muted">Žádné události v tomto měsíci</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
