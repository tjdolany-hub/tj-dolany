"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";

interface Draw {
  id: string;
  season: string;
  title: string;
  image: string;
  active: boolean;
}

export default function AdminDrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ season: "", title: "", active: true });
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const loadDraws = () => { fetch("/api/draws").then((r) => r.json()).then(setDraws).finally(() => setLoading(false)); };
  useEffect(() => { loadDraws(); }, []);

  const resetForm = () => { setForm({ season: "", title: "", active: true }); setImages([]); setEditId(null); setShowForm(false); };

  const startEdit = (d: Draw) => {
    setForm({ season: d.season, title: d.title, active: d.active });
    setImages([{ url: d.image }]);
    setEditId(d.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!images[0]?.url) { alert("Nahrajte obrázek losu"); return; }
    setSaving(true);
    const body = { ...form, image: images[0].url };
    const url = editId ? `/api/draws/${editId}` : "/api/draws";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { resetForm(); loadDraws(); }
    setSaving(false);
  };

  const deleteDraw = async (id: string) => { if (!confirm("Opravdu smazat?")) return; await fetch(`/api/draws/${id}`, { method: "DELETE" }); loadDraws(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Losy soutěže</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"><Plus size={16} /> Přidat los</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
          <h2 className="text-xl font-bold text-text">{editId ? "Upravit los" : "Nový los"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-text mb-1">Období</label><input type="text" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} required placeholder="2025/2026" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
            <div><label className="block text-sm font-semibold text-text mb-1">Název</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" /></div>
          </div>
          <div><label className="block text-sm font-semibold text-text mb-1">Obrázek losu</label><ImageUploader images={images} onChange={setImages} folder="draws" multiple={false} /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" /><span className="text-sm font-semibold text-text">Aktivní</span></label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50"><Save size={16} /> {saving ? "Ukládám..." : "Uložit"}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2 text-text hover:bg-surface-muted"><X size={16} /> Zrušit</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-text-muted">Načítám...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {draws.map((d) => (
            <div key={d.id} className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div><p className="font-semibold text-text">{d.title}</p><p className="text-xs text-text-muted">{d.season}{!d.active && " — neaktivní"}</p></div>
                <div className="flex gap-1"><button onClick={() => startEdit(d)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button><button onClick={() => deleteDraw(d.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button></div>
              </div>
              <img src={d.image} alt={d.title} className="w-full rounded-lg object-contain" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
