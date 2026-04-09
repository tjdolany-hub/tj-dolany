"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Pencil, Trash2, Plus, Save, X, Users, CheckCircle, Eye, EyeOff, ChevronDown, ChevronRight,
} from "lucide-react";
import { POSITIONS, POSITION_COLORS, POSITION_LABELS } from "@/lib/utils";
import ImageUploader from "@/components/admin/ImageUploader";

interface Player {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  preferred_foot: string | null;
  position: string;
  birth_date: string | null;
  number: number | null;
  photo: string | null;
  active: boolean;
  aliases: string[] | null;
}

interface PlayerForm {
  first_name: string;
  last_name: string;
  nickname: string;
  preferred_foot: string;
  position: string;
  birth_date: string;
  number: string;
  active: boolean;
  aliases: string;
}

const POSITION_ORDER = ["brankar", "obrance", "zaloznik", "utocnik"];

const GROUP_LABELS: Record<string, string> = {
  brankar: "Brankáři",
  obrance: "Obránci",
  zaloznik: "Záložníci",
  utocnik: "Útočníci",
};

const FOOT_OPTIONS = [
  { value: "", label: "—" },
  { value: "prava", label: "Pravá" },
  { value: "leva", label: "Levá" },
  { value: "obe", label: "Obě" },
];

function calcAge(birthDate: string): number {
  return Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

const emptyForm: PlayerForm = {
  first_name: "",
  last_name: "",
  nickname: "",
  preferred_foot: "",
  position: "zaloznik",
  birth_date: "",
  number: "",
  active: true,
  aliases: "",
};

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerForm>({ ...emptyForm });
  const [images, setImages] = useState<{ url: string; alt?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Stats from matches
  const [stats, setStats] = useState<Record<string, { matches: number; goals: number; yellows: number; reds: number }>>({});

  const loadPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/players");
      const data: Player[] = await res.json();
      setPlayers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/matches");
    const matches = await res.json();
    if (!Array.isArray(matches)) return;

    const s: Record<string, { matches: number; goals: number; yellows: number; reds: number }> = {};
    for (const m of matches) {
      if (m.match_lineups) {
        for (const l of m.match_lineups) {
          if (!s[l.player_id]) s[l.player_id] = { matches: 0, goals: 0, yellows: 0, reds: 0 };
          s[l.player_id].matches++;
        }
      }
      if (m.match_scorers) {
        for (const sc of m.match_scorers) {
          if (!s[sc.player_id]) s[sc.player_id] = { matches: 0, goals: 0, yellows: 0, reds: 0 };
          s[sc.player_id].goals += sc.goals;
        }
      }
      if (m.match_cards) {
        for (const c of m.match_cards) {
          if (!s[c.player_id]) s[c.player_id] = { matches: 0, goals: 0, yellows: 0, reds: 0 };
          if (c.card_type === "yellow") s[c.player_id].yellows++;
          else s[c.player_id].reds++;
        }
      }
    }
    setStats(s);
  }, []);

  useEffect(() => {
    loadPlayers();
    loadStats();
  }, [loadPlayers, loadStats]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setImages([]);
    setEditId(null);
    setShowForm(false);
    setSaved(false);
  };

  const updatePlayerForm = (patch: Partial<PlayerForm>) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const startEdit = (p: Player) => {
    setForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      nickname: p.nickname || "",
      preferred_foot: p.preferred_foot || "",
      position: p.position,
      birth_date: p.birth_date ?? "",
      number: p.number?.toString() ?? "",
      active: p.active,
      aliases: (p.aliases ?? []).join(", "),
    });
    setImages(p.photo ? [{ url: p.photo }] : []);
    setEditId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const name = `${form.first_name} ${form.last_name}`.trim();
    const aliases = form.aliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const body = {
      name,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      nickname: form.nickname || null,
      preferred_foot: form.preferred_foot || null,
      position: form.position,
      birth_date: form.birth_date || null,
      number: form.number ? parseInt(form.number, 10) : null,
      photo: images[0]?.url ?? null,
      active: form.active,
      aliases,
    };

    const url = editId ? `/api/players/${editId}` : "/api/players";
    const method = editId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (editId) { setSaved(true); } else { resetForm(); }
        await loadPlayers();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || `Chyba při ukládání (${res.status})`);
      }
    } finally {
      setSaving(false);
    }
  };

  const deletePlayer = async (id: string) => {
    if (!confirm("Opravdu smazat tohoto hráče?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/players/${id}`, { method: "DELETE" });
      await loadPlayers();
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (p: Player) => {
    await fetch(`/api/players/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    await loadPlayers();
  };

  const toggleGroup = (pos: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  };

  const filteredPlayers = players.filter((p) => {
    if (activeFilter === "active") return p.active;
    if (activeFilter === "inactive") return !p.active;
    return true;
  });

  const grouped = POSITION_ORDER.map((pos) => ({
    position: pos,
    label: GROUP_LABELS[pos],
    players: filteredPlayers.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-brand-red" />
          <h1 className="text-3xl font-bold text-text">Hráči</h1>
          <span className="text-sm text-text-muted">({players.length} celkem)</span>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
          <Plus size={16} /> Přidat hráče
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-surface-muted rounded-lg p-1 w-fit">
        {([
          { value: "all", label: "Vše" },
          { value: "active", label: "Aktivní" },
          { value: "inactive", label: "Neaktivní" },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              activeFilter === tab.value
                ? "bg-brand-red text-white"
                : "text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
            {tab.value === "active" && ` (${players.filter((p) => p.active).length})`}
            {tab.value === "inactive" && ` (${players.filter((p) => !p.active).length})`}
            {tab.value === "all" && ` (${players.length})`}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-8 space-y-4">
          <h2 className="text-xl font-bold text-text">{editId ? "Upravit hráče" : "Nový hráč"}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Jméno *</label>
              <input type="text" value={form.first_name} onChange={(e) => updatePlayerForm({ first_name: e.target.value })} required placeholder="Jan"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Příjmení *</label>
              <input type="text" value={form.last_name} onChange={(e) => updatePlayerForm({ last_name: e.target.value })} required placeholder="Novák"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Přezdívka</label>
              <input type="text" value={form.nickname} onChange={(e) => updatePlayerForm({ nickname: e.target.value })} placeholder="Novák"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Pozice</label>
              <select value={form.position} onChange={(e) => updatePlayerForm({ position: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red">
                {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Datum narození</label>
              <input type="date" value={form.birth_date} onChange={(e) => updatePlayerForm({ birth_date: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Číslo dresu</label>
              <input type="number" min={1} max={99} value={form.number} onChange={(e) => updatePlayerForm({ number: e.target.value })} placeholder="10"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Preferovaná noha</label>
              <select value={form.preferred_foot} onChange={(e) => updatePlayerForm({ preferred_foot: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red">
                {FOOT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => updatePlayerForm({ active: e.target.checked })} className="w-4 h-4 accent-brand-red" />
                <span className="text-sm font-semibold text-text">Aktivní</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Alternativní jména <span className="font-normal text-text-muted">(pro párování v datech, oddělená čárkou)</span></label>
            <input type="text" value={form.aliases} onChange={(e) => updatePlayerForm({ aliases: e.target.value })} placeholder="Jirka Berger, J. Berger, Berger Jiří"
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Fotka</label>
            <ImageUploader images={images} onChange={(imgs) => { setSaved(false); setImages(imgs); }} folder="players" multiple={false} maxWidth={800} />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
              <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2 text-text hover:bg-surface-muted transition-colors">
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

      {/* Player table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
          <span className="ml-3 text-text-muted">Načítám hráče...</span>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Users size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-semibold">Žádní hráči</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => {
            const isCollapsed = collapsedGroups.has(group.position);
            return (
              <section key={group.position}>
                <button
                  onClick={() => toggleGroup(group.position)}
                  className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
                >
                  {isCollapsed ? <ChevronRight size={18} className="text-text-muted" /> : <ChevronDown size={18} className="text-text-muted" />}
                  <span className={`inline-block w-3 h-3 rounded-full ${POSITION_COLORS[group.position]?.split(" ")[0] ?? ""}`} />
                  <h2 className="text-lg font-bold text-text">{group.label}</h2>
                  <span className="text-sm text-text-muted">({group.players.length})</span>
                </button>

                {!isCollapsed && (
                  <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/50">
                          <th className="text-left px-3 py-2.5 font-semibold text-text-muted w-12"></th>
                          <th className="text-left px-3 py-2.5 font-semibold text-text-muted">Jméno</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-text-muted hidden md:table-cell">Pozice</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-text-muted hidden sm:table-cell w-12">#</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-text-muted hidden lg:table-cell w-16">Věk</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-text-muted hidden sm:table-cell w-14">Záp.</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-text-muted hidden sm:table-cell w-14">Góly</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-text-muted hidden lg:table-cell w-14">ŽK</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-text-muted hidden lg:table-cell w-14">ČK</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-text-muted w-16">Aktiv.</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-text-muted w-20">Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.players.map((p) => {
                          const st = stats[p.id];
                          return (
                            <tr
                              key={p.id}
                              className={`border-b border-border last:border-b-0 hover:bg-surface-muted/30 transition-colors ${
                                !p.active ? "opacity-50" : ""
                              } ${deletingId === p.id ? "opacity-30 pointer-events-none" : ""}`}
                            >
                              {/* Photo */}
                              <td className="px-3 py-2">
                                <div className="w-9 h-9 rounded-full bg-surface-muted overflow-hidden relative shrink-0">
                                  {p.photo ? (
                                    <Image src={p.photo} alt={p.name} fill className="object-cover" sizes="36px" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-bold">
                                      {(p.first_name?.[0] || "")}{(p.last_name?.[0] || "")}
                                    </div>
                                  )}
                                </div>
                              </td>
                              {/* Name */}
                              <td className="px-3 py-2">
                                <div className="font-semibold text-text">
                                  {p.first_name || ""} {p.last_name || ""}
                                  {p.nickname && <span className="text-text-muted font-normal ml-1">({p.nickname})</span>}
                                </div>
                                {p.aliases && p.aliases.length > 0 && (
                                  <div className="text-[11px] text-text-muted mt-0.5 truncate max-w-[250px]" title={p.aliases.join(", ")}>
                                    {p.aliases.join(", ")}
                                  </div>
                                )}
                              </td>
                              {/* Position */}
                              <td className="px-3 py-2 hidden md:table-cell">
                                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${POSITION_COLORS[p.position] ?? ""}`}>
                                  {POSITION_LABELS[p.position] ?? p.position}
                                </span>
                              </td>
                              {/* Number */}
                              <td className="px-3 py-2 text-center font-mono font-bold text-text-muted hidden sm:table-cell">
                                {p.number ?? "—"}
                              </td>
                              {/* Age */}
                              <td className="px-3 py-2 text-center text-text-muted hidden lg:table-cell">
                                {p.birth_date ? calcAge(p.birth_date) : "—"}
                              </td>
                              {/* Stats */}
                              <td className="px-3 py-2 text-center text-text-muted hidden sm:table-cell">{st?.matches ?? 0}</td>
                              <td className="px-3 py-2 text-center text-text-muted hidden sm:table-cell">{st?.goals ?? 0}</td>
                              <td className="px-3 py-2 text-center hidden lg:table-cell">
                                {(st?.yellows ?? 0) > 0 ? <span className="text-yellow-500 font-semibold">{st?.yellows}</span> : <span className="text-text-muted">0</span>}
                              </td>
                              <td className="px-3 py-2 text-center hidden lg:table-cell">
                                {(st?.reds ?? 0) > 0 ? <span className="text-red-500 font-semibold">{st?.reds}</span> : <span className="text-text-muted">0</span>}
                              </td>
                              {/* Active toggle */}
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => toggleActive(p)} title={p.active ? "Deaktivovat" : "Aktivovat"}
                                  className="p-1 transition-colors hover:opacity-70">
                                  {p.active ? <Eye size={16} className="text-green-500" /> : <EyeOff size={16} className="text-text-muted" />}
                                </button>
                              </td>
                              {/* Actions */}
                              <td className="px-3 py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => startEdit(p)} title="Upravit" className="text-blue-500 hover:text-blue-700 p-1 transition-colors">
                                    <Pencil size={15} />
                                  </button>
                                  <button onClick={() => deletePlayer(p.id)} title="Smazat" className="text-red-500 hover:text-red-700 p-1 transition-colors">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
