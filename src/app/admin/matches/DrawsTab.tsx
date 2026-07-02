"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, Save, X, CheckCircle } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import { getSeasonList } from "@/lib/utils";

const SEASONS = getSeasonList();

interface Draw {
  id: string;
  season: string;
  title: string;
  image: string;
  active: boolean;
}

export default function DrawsTab() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawsLoading, setDrawsLoading] = useState(true);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawEditId, setDrawEditId] = useState<string | null>(null);
  const [drawForm, setDrawForm] = useState({ season: "2025/2026", title: "", active: true });
  const [drawImages, setDrawImages] = useState<{ url: string; alt?: string }[]>([]);
  const [drawSaving, setDrawSaving] = useState(false);
  const [drawSaved, setDrawSaved] = useState(false);

  const loadDraws = useCallback(() => {
    setDrawsLoading(true);
    fetch("/api/draws")
      .then((r) => r.json())
      .then((data) => setDraws(Array.isArray(data) ? data : []))
      .finally(() => setDrawsLoading(false));
  }, []);

  useEffect(() => {
    loadDraws();
  }, [loadDraws]);

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
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || `Chyba při ukládání (${res.status})`);
    }
    setDrawSaving(false);
  };

  const deleteDraw = async (id: string) => {
    if (!confirm("Opravdu smazat tento los?")) return;
    await fetch(`/api/draws/${id}`, { method: "DELETE" });
    loadDraws();
  };

  return (
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
  );
}
