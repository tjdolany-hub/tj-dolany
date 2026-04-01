"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDateTimeCzech } from "@/lib/utils";

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

const EVENT_TYPE_OPTIONS = [
  { value: "akce", label: "TJ Dolany" },
  { value: "pronajem", label: "Soukromá akce" },
  { value: "volne", label: "Ostatní" },
] as const;

type EventTypeValue = (typeof EVENT_TYPE_OPTIONS)[number]["value"];

const TYPE_BADGE_STYLES: Record<EventTypeValue, string> = {
  akce: "bg-red-100 text-red-700",
  pronajem: "bg-yellow-100 text-yellow-700",
  volne: "bg-gray-100 text-gray-700",
};

type FilterTab = "all" | EventTypeValue;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Vše" },
  { value: "akce", label: "TJ Dolany" },
  { value: "pronajem", label: "Soukromé" },
  { value: "volne", label: "Ostatní" },
];

const MONTH_NAMES = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  date: "",
  event_type: "akce" as EventTypeValue,
  location: "",
  is_public: true,
};

function getTypeLabel(value: string): string {
  return EVENT_TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

function getTypeBadgeStyle(value: string): string {
  return TYPE_BADGE_STYLES[value as EventTypeValue] ?? "bg-gray-100 text-gray-700";
}

export default function AdminEventsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  const loadEvents = useCallback(() => {
    setLoading(true);
    fetch(`/api/calendar?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((data: CalendarEvent[]) => {
        const filtered = data.filter(
          (e) => !["zapas", "trenink"].includes(e.event_type)
        );
        filtered.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setEvents(filtered);
      })
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (e: CalendarEvent) => {
    setForm({
      title: e.title,
      description: e.description || "",
      date: e.date.slice(0, 16),
      event_type: e.event_type as EventTypeValue,
      location: e.location || "",
      is_public: e.is_public,
    });
    setEditId(e.id);
    setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      end_date: null,
      description: form.description || null,
      location: form.location || null,
    };
    const url = editId ? `/api/calendar/${editId}` : "/api/calendar";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      resetForm();
      loadEvents();
    }
    setSaving(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Opravdu smazat tuto událost?")) return;
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    loadEvents();
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const displayedEvents =
    filter === "all"
      ? events
      : events.filter((e) => e.event_type === filter);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-text">Správa akcí</h1>
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

      {/* Month navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg border border-border hover:bg-surface-muted text-text transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 text-text font-semibold">
          <Calendar size={18} className="text-brand-red" />
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg border border-border hover:bg-surface-muted text-text transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === tab.value
                ? "bg-brand-red text-white"
                : "bg-surface border border-border text-text hover:bg-surface-muted"
            }`}
          >
            {tab.label}
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
            {editId ? "Upravit akci" : "Nová akce"}
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
                Datum a čas
              </label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Typ
              </label>
              <select
                value={form.event_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    event_type: e.target.value as EventTypeValue,
                  })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
              >
                {EVENT_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Místo
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-1">
              Pořadatel
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) =>
                setForm({ ...form, is_public: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold text-text">Veřejná</span>
          </label>
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
                <th className="text-left p-3 font-semibold text-text">
                  Datum
                </th>
                <th className="text-left p-3 font-semibold text-text">
                  Název
                </th>
                <th className="text-left p-3 font-semibold text-text">Typ</th>
                <th className="text-left p-3 font-semibold text-text">
                  Pořadatel
                </th>
                <th className="text-right p-3 font-semibold text-text">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedEvents.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3 text-text-muted whitespace-nowrap">
                    {formatDateTimeCzech(e.date)}
                  </td>
                  <td className="p-3 text-text font-medium">{e.title}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${getTypeBadgeStyle(e.event_type)}`}
                    >
                      {getTypeLabel(e.event_type)}
                    </span>
                  </td>
                  <td className="p-3 text-text-muted">
                    {e.description || "—"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(e)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteEvent(e.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-text-muted"
                  >
                    Žádné akce v tomto měsíci
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
