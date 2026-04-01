"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";
import { formatDateCzech } from "@/lib/utils";
import ImageUploader from "@/components/admin/ImageUploader";

interface FutureEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  poster: string | null;
  published: boolean;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<FutureEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", date: "", published: true });
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const loadEvents = () => {
    fetch("/api/events").then((r) => r.json()).then(setEvents).finally(() => setLoading(false));
  };

  useEffect(() => { loadEvents(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", date: "", published: true });
    setImages([]);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (e: FutureEvent) => {
    setForm({ title: e.title, description: e.description || "", date: e.date.slice(0, 10), published: e.published });
    setImages(e.poster ? [{ url: e.poster }] : []);
    setEditId(e.id);
    setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    const body = { ...form, poster: images[0]?.url || null, description: form.description || null };
    const url = editId ? `/api/events/${editId}` : "/api/events";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { resetForm(); loadEvents(); }
    setSaving(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Opravdu smazat?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    loadEvents();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Akce</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
          <Plus size={16} /> Přidat akci
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
          <h2 className="text-xl font-bold text-text">{editId ? "Upravit akci" : "Nová akce"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-text mb-1">Název</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
            <div><label className="block text-sm font-semibold text-text mb-1">Datum</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
          </div>
          <div><label className="block text-sm font-semibold text-text mb-1">Popis</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
          <div><label className="block text-sm font-semibold text-text mb-1">Plakát</label><ImageUploader images={images} onChange={setImages} folder="events" multiple={false} /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="w-4 h-4" /><span className="text-sm font-semibold text-text">Publikovat</span></label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {saving ? "Ukládám..." : "Uložit"}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2 text-text hover:bg-surface-muted"><X size={16} /> Zrušit</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-text-muted">Načítám...</p> : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted"><tr><th className="text-left p-3 font-semibold text-text">Název</th><th className="text-left p-3 font-semibold text-text">Datum</th><th className="text-left p-3 font-semibold text-text">Stav</th><th className="text-right p-3 font-semibold text-text">Akce</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3 text-text font-medium">{e.title}</td>
                  <td className="p-3 text-text-muted">{formatDateCzech(e.date)}</td>
                  <td className="p-3"><span className={`text-xs font-bold px-2 py-1 rounded ${e.published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{e.published ? "Publikováno" : "Skryto"}</span></td>
                  <td className="p-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => startEdit(e)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button><button onClick={() => deleteEvent(e.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button></div></td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-text-muted">Zatím žádné akce</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
