"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, Upload, Check, Loader2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  keywords: string[];
  logo_url: string | null;
  created_at: string;
}

const emptyForm = {
  name: "",
  keywords: "",
  logo_url: null as string | null,
};

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    setLoading(true);
    const res = await fetch("/api/teams");
    const data = await res.json();
    setTeams(data);
    setLoading(false);
  }

  function updateForm(updates: Partial<typeof form>) {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function startEdit(team: Team) {
    setEditingId(team.id);
    setShowNew(false);
    setForm({
      name: team.name,
      keywords: team.keywords.join(", "),
      logo_url: team.logo_url,
    });
    setSaved(false);
  }

  function startNew() {
    setEditingId(null);
    setShowNew(true);
    setForm(emptyForm);
    setSaved(false);
  }

  function cancel() {
    setEditingId(null);
    setShowNew(false);
    setForm(emptyForm);
    setSaved(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("removeBackground", removeBackground ? "true" : "false");
      const res = await fetch("/api/teams/process-logo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        updateForm({ logo_url: data.url });
      } else {
        alert(data.error || "Chyba při nahrávání");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const keywords = form.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const payload = { name: form.name, keywords, logo_url: form.logo_url };

    try {
      if (editingId) {
        const res = await fetch(`/api/teams/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setSaved(true);
          fetchTeams();
        }
      } else {
        const res = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          cancel();
          fetchTeams();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Opravdu smazat tento tým?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (editingId === id) cancel();
      fetchTeams();
    } finally {
      setDeleting(null);
    }
  }

  const isFormOpen = showNew || editingId;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight">Týmy</h1>
          <p className="text-sm text-text-muted mt-1">Správa soupeřů a jejich znaků</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={startNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg text-sm font-medium hover:bg-brand-red/90 transition-colors"
          >
            <Plus size={16} />
            Přidat tým
          </button>
        )}
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-text mb-4">
            {editingId ? "Upravit tým" : "Nový tým"}
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Název týmu</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="FK Deštné/MFK N.Město B"
                className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-red/30"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Klíčová slova</label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) => updateForm({ keywords: e.target.value })}
                placeholder="destne, deštné, n.město"
                className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-red/30"
              />
              <p className="text-xs text-text-muted mt-1">
                Oddělte čárkou. Slouží k automatickému přiřazení znaku k soupeři v zápase.
              </p>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Znak</label>
              <div className="flex items-start gap-4">
                {form.logo_url ? (
                  <div className="relative w-20 h-20 rounded-lg border border-border bg-surface-muted flex items-center justify-center overflow-hidden">
                    <Image
                      src={form.logo_url}
                      alt="Logo"
                      width={80}
                      height={80}
                      className="object-contain"
                    />
                    <button
                      onClick={() => updateForm({ logo_url: null })}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-surface-muted flex items-center justify-center text-text-muted">
                    <Upload size={20} />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 bg-surface-muted border border-border rounded-lg text-sm text-text hover:bg-surface transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <><Loader2 size={14} className="animate-spin" /> Nahrávám...</>
                    ) : (
                      <><Upload size={14} /> Nahrát znak</>
                    )}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removeBackground}
                      onChange={(e) => setRemoveBackground(e.target.checked)}
                      className="rounded border-border"
                    />
                    Automaticky odebrat bílé pozadí
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg text-sm font-medium hover:bg-brand-red/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Uložit
            </button>
            <button
              onClick={cancel}
              className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              Zrušit
            </button>
            {saved && (
              <span className="text-sm text-green-500 font-medium">Uloženo</span>
            )}
          </div>
        </div>
      )}

      {/* Team list */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Načítám...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-text-muted">Žádné týmy</div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {teams.map((team) => (
              <div
                key={team.id}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-surface-muted/50 transition-colors ${
                  editingId === team.id ? "bg-brand-red/5 border-l-2 border-l-brand-red" : ""
                }`}
              >
                {/* Logo */}
                <div className="w-10 h-10 rounded-lg bg-surface-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {team.logo_url ? (
                    <Image
                      src={team.logo_url}
                      alt={team.name}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-xs text-text-muted">?</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{team.name}</p>
                  {team.keywords.length > 0 && (
                    <p className="text-xs text-text-muted truncate">
                      {team.keywords.join(", ")}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(team)}
                    className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface-muted transition-colors"
                    title="Upravit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    disabled={deleting === team.id}
                    className="p-2 text-text-muted hover:text-red-500 rounded-lg hover:bg-surface-muted transition-colors disabled:opacity-50"
                    title="Smazat"
                  >
                    {deleting === team.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
