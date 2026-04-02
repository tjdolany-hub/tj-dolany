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
  Clock,
} from "lucide-react";
import { formatDateTimeCzech, LOCATION_LABELS, ORGANIZERS } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  event_type: string;
  location: string | null;
  organizer: string | null;
  is_public: boolean;
}

interface ScheduleEntry {
  id: string;
  day_of_week: number;
  title: string;
  time_from: string;
  time_to: string | null;
  location: string | null;
}

// ─── Constants ───────────────────────────────────────────────

const EVENT_TYPE_OPTIONS = [
  { value: "akce", label: "Akce TJ" },
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
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const DAY_NAMES = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

const LOCATION_OPTIONS = [
  { value: "sokolovna", label: "Sokolovna" },
  { value: "kantyna", label: "Kantýna" },
  { value: "venkovni_cast", label: "Venkovní část" },
  { value: "hriste", label: "Hřiště" },
] as const;

const DEFAULT_FORM = {
  title: "",
  description: "",
  date: "",
  time: "",
  allDay: false,
  event_type: "akce" as EventTypeValue,
  locationAll: true,
  locations: [] as string[],
  organizer: "TJ Dolany",
  customOrganizer: "",
  is_public: true,
};

const DEFAULT_SCHEDULE_FORM = {
  day_of_week: 1,
  title: "",
  time_from: "",
  time_to: "",
  location: "",
};

function getTypeLabel(value: string): string {
  return EVENT_TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

function getTypeBadgeStyle(value: string): string {
  return TYPE_BADGE_STYLES[value as EventTypeValue] ?? "bg-gray-100 text-gray-700";
}

// ─── Main Component ──────────────────────────────────────────

export default function AdminPlanAkciPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<"events" | "schedule">("events");

  // ── Events state ──
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  // ── Schedule state ──
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleEditId, setScheduleEditId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState(DEFAULT_SCHEDULE_FORM);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // ── Events logic ──

  const loadEvents = useCallback(() => {
    setLoading(true);
    fetch(`/api/calendar?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((data: CalendarEvent[]) => {
        const filtered = data.filter((e) => !["zapas", "trenink"].includes(e.event_type));
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
    const d = new Date(e.date);
    const h = d.getHours();
    const m = d.getMinutes();
    const isAllDay = h === 0 && m === 0;
    const isPreset = ORGANIZERS.includes(e.organizer as typeof ORGANIZERS[number]);
    const isAll = !e.location || e.location === "cely_areal";
    const locations = isAll ? [] : e.location!.split(",");
    setForm({
      title: e.event_type === "pronajem" && e.title === "Soukromá akce" ? "" : e.title,
      description: e.description || "",
      date: e.date.slice(0, 10),
      time: isAllDay ? "" : `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      allDay: isAllDay,
      event_type: e.event_type as EventTypeValue,
      locationAll: isAll,
      locations,
      organizer: isPreset ? (e.organizer || "TJ Dolany") : "__custom__",
      customOrganizer: isPreset ? "" : (e.organizer || ""),
      is_public: e.is_public,
    });
    setEditId(e.id);
    setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);

    const dateTime = form.allDay ? `${form.date}T00:00` : (form.time ? `${form.date}T${form.time}` : `${form.date}T00:00`);
    const organizer = form.organizer === "__custom__" ? form.customOrganizer : form.organizer;
    const location = form.locationAll ? "cely_areal" : form.locations.join(",");
    const title = form.event_type === "pronajem" ? "Soukromá akce" : form.title;

    const body = {
      title,
      description: form.description || null,
      date: dateTime,
      end_date: null,
      event_type: form.event_type,
      location: location || null,
      organizer: organizer || null,
      is_public: form.is_public,
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
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const displayedEvents = filter === "all" ? events : events.filter((e) => e.event_type === filter);

  // ── Schedule logic ──

  const loadSchedule = useCallback(() => {
    setScheduleLoading(true);
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((data: ScheduleEntry[]) => setScheduleEntries(data))
      .finally(() => setScheduleLoading(false));
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const resetScheduleForm = () => {
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
    setScheduleEditId(null);
    setShowScheduleForm(false);
  };

  const startScheduleEdit = (s: ScheduleEntry) => {
    setScheduleForm({
      day_of_week: s.day_of_week,
      title: s.title,
      time_from: s.time_from,
      time_to: s.time_to || "",
      location: s.location || "",
    });
    setScheduleEditId(s.id);
    setShowScheduleForm(true);
  };

  const handleScheduleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setScheduleSaving(true);
    const body = {
      ...scheduleForm,
      time_to: scheduleForm.time_to || null,
      location: scheduleForm.location || null,
    };
    const url = scheduleEditId ? `/api/schedule/${scheduleEditId}` : "/api/schedule";
    const method = scheduleEditId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      resetScheduleForm();
      loadSchedule();
    }
    setScheduleSaving(false);
  };

  const deleteScheduleEntry = async (id: string) => {
    if (!confirm("Opravdu smazat?")) return;
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    loadSchedule();
  };

  // ── Render ──

  return (
    <div>
      <h1 className="text-3xl font-bold text-text mb-6">Plán akcí</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "events"
              ? "bg-brand-red text-white"
              : "text-text-muted hover:text-text hover:bg-surface-muted"
          }`}
        >
          <Calendar size={16} className="inline mr-2" />
          Akce
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "schedule"
              ? "bg-brand-red text-white"
              : "text-text-muted hover:text-text hover:bg-surface-muted"
          }`}
        >
          <Clock size={16} className="inline mr-2" />
          Pravidelné akce
        </button>
      </div>

      {/* ═══ EVENTS TAB ═══ */}
      {activeTab === "events" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="p-2 rounded-lg border border-border hover:bg-surface-muted text-text">
                <ChevronLeft size={18} />
              </button>
              <span className="font-semibold text-text">{MONTH_NAMES[month - 1]} {year}</span>
              <button onClick={nextMonth} className="p-2 rounded-lg border border-border hover:bg-surface-muted text-text">
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Plus size={16} /> Přidat akci
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

          {/* Event form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">{editId ? "Upravit akci" : "Nová akce"}</h2>
                <button type="button" onClick={resetForm} className="text-text-muted hover:text-text"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Datum</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas</label>
                  {form.allDay ? (
                    <div className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text-muted text-sm">Celý den</div>
                  ) : (
                    <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                  )}
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked, time: "" })} className="w-3.5 h-3.5" />
                    <span className="text-xs text-text-muted">Celý den</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Typ</label>
                  <select value={form.event_type} onChange={(e) => {
                    const val = e.target.value as EventTypeValue;
                    setForm({ ...form, event_type: val, title: val === "pronajem" ? "" : form.title });
                  }}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red">
                    {EVENT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                {form.event_type !== "pronajem" && (
                  <div>
                    <label className="block text-sm font-semibold text-text mb-1">Název</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Pořadatel</label>
                  <select
                    value={form.organizer}
                    onChange={(e) => setForm({ ...form, organizer: e.target.value, customOrganizer: "" })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
                  >
                    {ORGANIZERS.map((o) => <option key={o} value={o}>{o}</option>)}
                    <option value="__custom__">Jiný...</option>
                  </select>
                  {form.organizer === "__custom__" && (
                    <input type="text" value={form.customOrganizer} onChange={(e) => setForm({ ...form, customOrganizer: e.target.value })}
                      placeholder="Jméno pořadatele" className="w-full px-3 py-2 mt-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Místo</label>
                  <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                    <input type="checkbox" checked={form.locationAll}
                      onChange={(e) => setForm({ ...form, locationAll: e.target.checked, locations: [] })}
                      className="w-4 h-4 accent-brand-red" />
                    <span className="text-sm text-text font-medium">Celý areál</span>
                  </label>
                  {!form.locationAll && (
                    <div className="space-y-1 ml-1">
                      {LOCATION_OPTIONS.map((l) => (
                        <label key={l.value} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox"
                            checked={form.locations.includes(l.value)}
                            onChange={(e) => {
                              const locs = e.target.checked
                                ? [...form.locations, l.value]
                                : form.locations.filter((v) => v !== l.value);
                              setForm({ ...form, locations: locs });
                            }}
                            className="w-3.5 h-3.5 accent-brand-red" />
                          <span className="text-sm text-text">{l.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm font-semibold text-text">Veřejná</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1">Popis</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
              </div>

              <button type="submit" disabled={saving}
                className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
              </button>
            </form>
          )}

          {/* Events table */}
          {loading ? (
            <p className="text-text-muted">Načítám...</p>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className="text-left p-3 font-semibold text-text">Datum</th>
                    <th className="text-left p-3 font-semibold text-text">Název</th>
                    <th className="text-left p-3 font-semibold text-text hidden md:table-cell">Typ</th>
                    <th className="text-left p-3 font-semibold text-text hidden md:table-cell">Pořadatel</th>
                    <th className="text-left p-3 font-semibold text-text hidden lg:table-cell">Místo</th>
                    <th className="text-right p-3 font-semibold text-text">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEvents.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="p-3 text-text-muted whitespace-nowrap">{formatDateTimeCzech(e.date)}</td>
                      <td className="p-3 text-text font-medium">{e.title}</td>
                      <td className="p-3 hidden md:table-cell">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${getTypeBadgeStyle(e.event_type)}`}>
                          {getTypeLabel(e.event_type)}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted hidden md:table-cell">{e.organizer || "—"}</td>
                      <td className="p-3 text-text-muted hidden lg:table-cell">{LOCATION_LABELS[e.location || ""] || e.location || "—"}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(e)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button>
                          <button onClick={() => deleteEvent(e.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayedEvents.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-text-muted">Žádné akce v tomto měsíci</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ SCHEDULE TAB ═══ */}
      {activeTab === "schedule" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text">Pravidelné akce v sokolovně</h2>
            <button
              onClick={() => { resetScheduleForm(); setShowScheduleForm(true); }}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Plus size={16} /> Přidat
            </button>
          </div>

          {showScheduleForm && (
            <form onSubmit={handleScheduleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">{scheduleEditId ? "Upravit" : "Nový záznam"}</h2>
                <button type="button" onClick={resetScheduleForm} className="text-text-muted hover:text-text"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Den</label>
                  <select value={scheduleForm.day_of_week} onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text">
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Název</label>
                  <input type="text" value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas od</label>
                  <input type="time" value={scheduleForm.time_from} onChange={(e) => setScheduleForm({ ...scheduleForm, time_from: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas do</label>
                  <input type="time" value={scheduleForm.time_to} onChange={(e) => setScheduleForm({ ...scheduleForm, time_to: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Místo</label>
                  <input type="text" value={scheduleForm.location} onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                </div>
              </div>
              <button type="submit" disabled={scheduleSaving}
                className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                <Save size={16} /> {scheduleSaving ? "Ukládám..." : "Uložit"}
              </button>
            </form>
          )}

          {scheduleLoading ? (
            <p className="text-text-muted">Načítám...</p>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className="text-left p-3 font-semibold text-text">Den</th>
                    <th className="text-left p-3 font-semibold text-text">Název</th>
                    <th className="text-left p-3 font-semibold text-text">Čas</th>
                    <th className="text-left p-3 font-semibold text-text hidden md:table-cell">Místo</th>
                    <th className="text-right p-3 font-semibold text-text">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleEntries.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="p-3 text-text font-medium">{DAY_NAMES[s.day_of_week]}</td>
                      <td className="p-3 text-text">{s.title}</td>
                      <td className="p-3 text-text-muted">{s.time_from}{s.time_to ? ` – ${s.time_to}` : ""}</td>
                      <td className="p-3 text-text-muted hidden md:table-cell">{s.location || "—"}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startScheduleEdit(s)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button>
                          <button onClick={() => deleteScheduleEntry(s.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {scheduleEntries.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-text-muted">Žádné pravidelné akce</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
