"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Plus, Save, X, Clock } from "lucide-react";

interface ScheduleEntry {
  id: string;
  day_of_week: number;
  title: string;
  time_from: string;
  time_to: string;
  location: string;
}

const DAY_NAMES = [
  "Neděle",
  "Pondělí",
  "Úterý",
  "Středa",
  "Čtvrtek",
  "Pátek",
  "Sobota",
];

const DAY_BADGE_STYLES: Record<number, string> = {
  0: "bg-purple-100 text-purple-700",
  1: "bg-blue-100 text-blue-700",
  2: "bg-green-100 text-green-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-red-100 text-red-700",
  6: "bg-pink-100 text-pink-700",
};

// Display order: Po-Ne (1,2,3,4,5,6,0)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_FORM = {
  day_of_week: 1,
  title: "",
  time_from: "",
  time_to: "",
  location: "",
};

export default function AdminSchedulePage() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  const loadEntries = useCallback(() => {
    setLoading(true);
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((data: ScheduleEntry[]) => {
        data.sort((a, b) => {
          const dayA = DAY_ORDER.indexOf(a.day_of_week);
          const dayB = DAY_ORDER.indexOf(b.day_of_week);
          if (dayA !== dayB) return dayA - dayB;
          return a.time_from.localeCompare(b.time_from);
        });
        setEntries(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (e: ScheduleEntry) => {
    setForm({
      day_of_week: e.day_of_week,
      title: e.title,
      time_from: e.time_from,
      time_to: e.time_to,
      location: e.location,
    });
    setEditId(e.id);
    setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    const url = editId ? `/api/schedule/${editId}` : "/api/schedule";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      resetForm();
      loadEntries();
    }
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Opravdu smazat tuto pravidelnou akci?")) return;
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    loadEntries();
  };

  const displayedEntries =
    filterDay === null
      ? entries
      : entries.filter((e) => e.day_of_week === filterDay);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-text">
          Pravidelné akce v sokolovně
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> Přidat akci
        </button>
      </div>

      {/* Day filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterDay(null)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            filterDay === null
              ? "bg-brand-red text-white"
              : "bg-surface border border-border text-text hover:bg-surface-muted"
          }`}
        >
          Vše
        </button>
        {DAY_ORDER.map((day) => (
          <button
            key={day}
            onClick={() => setFilterDay(day)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filterDay === day
                ? "bg-brand-red text-white"
                : "bg-surface border border-border text-text hover:bg-surface-muted"
            }`}
          >
            {DAY_NAMES[day]}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4"
        >
          <h2 className="text-xl font-bold text-text">
            {editId ? "Upravit akci" : "Nová pravidelná akce"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Název
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Den
              </label>
              <select
                value={form.day_of_week}
                onChange={(e) =>
                  setForm({ ...form, day_of_week: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
              >
                {DAY_ORDER.map((day) => (
                  <option key={day} value={day}>
                    {DAY_NAMES[day]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Čas od
              </label>
              <input
                type="time"
                value={form.time_from}
                onChange={(e) =>
                  setForm({ ...form, time_from: e.target.value })
                }
                required
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Čas do
              </label>
              <input
                type="time"
                value={form.time_to}
                onChange={(e) => setForm({ ...form, time_to: e.target.value })}
                required
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-1">
              Místo
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-border rounded-lg text-sm flex items-center gap-2 text-text hover:bg-surface-muted transition-colors"
            >
              <X size={16} /> Zrušit
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-text-muted">Načítám...</p>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="text-left p-3 font-semibold text-text">Den</th>
                <th className="text-left p-3 font-semibold text-text">
                  Název
                </th>
                <th className="text-left p-3 font-semibold text-text">Čas</th>
                <th className="text-left p-3 font-semibold text-text">
                  Místo
                </th>
                <th className="text-right p-3 font-semibold text-text">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedEntries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${DAY_BADGE_STYLES[e.day_of_week] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {DAY_NAMES[e.day_of_week]}
                    </span>
                  </td>
                  <td className="p-3 text-text font-medium">{e.title}</td>
                  <td className="p-3 text-text-muted whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} />
                      {e.time_from} – {e.time_to}
                    </span>
                  </td>
                  <td className="p-3 text-text-muted">{e.location}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(e)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteEntry(e.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedEntries.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-text-muted"
                  >
                    Žádné pravidelné akce
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
