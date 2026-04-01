"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";
import { POSITIONS, POSITION_COLORS, POSITION_LABELS } from "@/lib/utils";
import ImageUploader from "@/components/admin/ImageUploader";

interface Player {
  id: string;
  name: string;
  position: string;
  number: number | null;
  photo: string | null;
  description: string | null;
  sort_order: number;
  active: boolean;
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    position: "zaloznik",
    number: "",
    photo: "",
    description: "",
    active: true,
  });
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const loadPlayers = () => {
    fetch("/api/players")
      .then((r) => r.json())
      .then(setPlayers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPlayers(); }, []);

  const resetForm = () => {
    setForm({ name: "", position: "zaloznik", number: "", photo: "", description: "", active: true });
    setImages([]);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (p: Player) => {
    setForm({
      name: p.name,
      position: p.position,
      number: p.number?.toString() || "",
      photo: p.photo || "",
      description: p.description || "",
      active: p.active,
    });
    setImages(p.photo ? [{ url: p.photo }] : []);
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const body = {
      name: form.name,
      position: form.position,
      number: form.number ? parseInt(form.number) : null,
      photo: images[0]?.url || null,
      description: form.description || null,
      active: form.active,
    };

    const url = editId ? `/api/players/${editId}` : "/api/players";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      resetForm();
      loadPlayers();
    }
    setSaving(false);
  };

  const deletePlayer = async (id: string) => {
    if (!confirm("Opravdu smazat tohoto hráče?")) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    loadPlayers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Hráči</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> Přidat hráče
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
          <h2 className="text-xl font-bold text-text">
            {editId ? "Upravit hráče" : "Nový hráč"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Jméno</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Pozice</label>
              <select
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Číslo dresu</label>
              <input
                type="number"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Popis</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Fotka</label>
            <ImageUploader images={images} onChange={setImages} folder="players" multiple={false} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm font-semibold text-text">Aktivní</span>
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
              <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2 text-text hover:bg-surface-muted transition-colors">
              <X size={16} /> Zrušit
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-text-muted">Načítám...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p) => (
            <div key={p.id} className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-surface-muted overflow-hidden shrink-0">
                {p.photo ? (
                  <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-2xl">?</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text truncate">{p.name}</p>
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${POSITION_COLORS[p.position] || ""}`}>
                  {POSITION_LABELS[p.position] || p.position} {p.number && `#${p.number}`}
                </span>
                {!p.active && <span className="text-xs text-text-muted ml-2">neaktivní</span>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(p)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button>
                <button onClick={() => deletePlayer(p.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
