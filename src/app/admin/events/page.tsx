"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  Calendar,
  Clock,
  FileText,
} from "lucide-react";
import { formatDateTimeCzech, LOCATION_LABELS, ORGANIZERS } from "@/lib/utils";
import RentalRequestsTab from "./RentalRequestsTab";

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
  organizer: string | null;
  valid_from: string | null;
  valid_to: string | null;
}

interface MatchEvent {
  id: string;
  date: string;
  opponent: string;
  is_home: boolean;
  competition: string | null;
  venue: string | null;
}

// ─── Constants ───────────────────────────────────────────────

const EVENT_TYPE_OPTIONS = [
  { value: "akce", label: "Akce TJ" },
  { value: "pronajem", label: "Soukromá akce" },
  { value: "volne", label: "Ostatní" },
] as const;

type EventTypeValue = (typeof EVENT_TYPE_OPTIONS)[number]["value"];

const TYPE_BADGE_STYLES: Record<string, string> = {
  akce: "bg-red-100 text-red-700",
  pronajem: "bg-yellow-100 text-yellow-700",
  volne: "bg-gray-100 text-gray-700",
  zapas: "bg-green-100 text-green-700",
};

const LOCATION_OPTIONS = [
  { value: "sokolovna", label: "Sokolovna" },
  { value: "kantyna", label: "Kantýna" },
  { value: "venkovni_cast", label: "Venkovní část" },
  { value: "hriste", label: "Hřiště" },
] as const;

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const DAY_NAMES = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

type FilterType = "all" | EventTypeValue | "zapas";
type FilterMonth = "all" | number;

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

const SCHEDULE_LOCATION_OPTIONS = [
  { value: "cely_areal", label: "Celý areál" },
  { value: "sokolovna", label: "Sokolovna" },
  { value: "kantyna", label: "Kantýna" },
  { value: "venkovni_cast", label: "Venkovní část" },
  { value: "hriste", label: "Hřiště" },
] as const;

const DEFAULT_SCHEDULE_FORM = {
  day_of_week: 1,
  title: "",
  time_from: "",
  time_to: "",
  locationAll: true,
  locations: [] as string[],
  organizer: "TJ Dolany",
  customOrganizer: "",
  valid_from: "",
  valid_to: "",
};

function getTypeLabel(value: string): string {
  if (value === "zapas") return "Zápas";
  return EVENT_TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

function getTypeBadgeStyle(value: string): string {
  return TYPE_BADGE_STYLES[value] ?? "bg-gray-100 text-gray-700";
}

function formatLocation(loc: string | null): string {
  if (!loc) return "—";
  if (loc === "cely_areal") return "Celý areál";
  return loc.split(",").map((v) => LOCATION_LABELS[v.trim()] || v.trim()).join(", ");
}

// ─── Main Component ──────────────────────────────────────────

export default function AdminPlanAkciPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<"events" | "schedule" | "requests">("events");
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  // ── Events state ──
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [matches, setMatches] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterMonth, setFilterMonth] = useState<FilterMonth>("all");

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
    Promise.all([
      fetch(`/api/calendar?year=${filterYear}`).then((r) => r.json()),
      fetch(`/api/matches?season=`).then((r) => r.json()),
    ]).then(([evts, mtchs]) => {
      const filtered = (Array.isArray(evts) ? evts : []).filter(
        (e: CalendarEvent) => !["zapas", "trenink"].includes(e.event_type)
      );
      filtered.sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(filtered);
      setMatches(
        (Array.isArray(mtchs) ? mtchs : [])
          .filter((m: MatchEvent) => new Date(m.date).getFullYear() === filterYear)
          .sort((a: MatchEvent, b: MatchEvent) => new Date(a.date).getTime() - new Date(b.date).getTime())
      );
    }).finally(() => setLoading(false));
  }, [filterYear]);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);

    const dateTime = form.allDay
      ? new Date(`${form.date}T00:00`).toISOString()
      : form.time
        ? new Date(`${form.date}T${form.time}`).toISOString()
        : new Date(`${form.date}T00:00`).toISOString();
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

  // Merge events and matches for display
  type DisplayItem = { type: "event"; data: CalendarEvent } | { type: "match"; data: MatchEvent };
  const allItems: DisplayItem[] = [
    ...events.map((e) => ({ type: "event" as const, data: e })),
    ...matches.map((m) => ({ type: "match" as const, data: m })),
  ].sort((a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime());

  // Apply filters
  const filteredItems = allItems.filter((item) => {
    const d = new Date(item.data.date);
    if (filterMonth !== "all" && d.getMonth() !== filterMonth) return false;
    if (filterType === "all") return true;
    if (filterType === "zapas") return item.type === "match";
    if (item.type === "match") return false;
    return item.data.event_type === filterType;
  });

  // Find next event index
  const nextIdx = filteredItems.findIndex((item) => new Date(item.data.date) >= now);

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
    const isAll = !s.location || s.location === "cely_areal";
    const isPreset = ORGANIZERS.includes(s.organizer as typeof ORGANIZERS[number]);
    setScheduleForm({
      day_of_week: s.day_of_week,
      title: s.title,
      time_from: s.time_from,
      time_to: s.time_to || "",
      locationAll: isAll,
      locations: isAll ? [] : s.location!.split(","),
      organizer: isPreset ? (s.organizer || "TJ Dolany") : (s.organizer ? "__custom__" : "TJ Dolany"),
      customOrganizer: isPreset ? "" : (s.organizer || ""),
      valid_from: s.valid_from || "",
      valid_to: s.valid_to || "",
    });
    setScheduleEditId(s.id);
    setShowScheduleForm(true);
  };

  const handleScheduleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setScheduleSaving(true);
    const location = scheduleForm.locationAll ? "cely_areal" : scheduleForm.locations.join(",");
    const organizer = scheduleForm.organizer === "__custom__" ? scheduleForm.customOrganizer : scheduleForm.organizer;
    const body = {
      day_of_week: scheduleForm.day_of_week,
      title: scheduleForm.title,
      time_from: scheduleForm.time_from,
      time_to: scheduleForm.time_to || null,
      location: location || null,
      organizer: organizer || null,
      valid_from: scheduleForm.valid_from || null,
      valid_to: scheduleForm.valid_to || null,
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
            activeTab === "events" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"
          }`}
        >
          <Calendar size={16} className="inline mr-2" />
          Akce
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "schedule" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"
          }`}
        >
          <Clock size={16} className="inline mr-2" />
          Pravidelné akce
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "requests" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"
          }`}
        >
          <FileText size={16} className="inline mr-2" />
          Žádosti
          {pendingRequestCount > 0 && (
            <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingRequestCount}
            </span>
          )}
        </button>
      </div>

      {/* ═══ EVENTS TAB ═══ */}
      {activeTab === "events" && (
        <>
          {/* Top bar: year + add button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <button key={y} onClick={() => setFilterYear(y)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterYear === y ? "bg-brand-red text-white" : "bg-surface border border-border text-text-muted hover:text-text"
                  }`}>
                  {y}
                </button>
              ))}
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Plus size={16} /> Přidat akci
            </button>
          </div>

          {/* Filters: type + month */}
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { value: "all", label: "Vše" },
              { value: "akce", label: "Akce TJ" },
              { value: "pronajem", label: "Soukromé" },
              { value: "volne", label: "Ostatní" },
              { value: "zapas", label: "Zápasy" },
            ] as { value: FilterType; label: string }[]).map((f) => (
              <button key={f.value} onClick={() => setFilterType(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === f.value ? "bg-brand-yellow text-brand-dark" : "bg-surface border border-border text-text-muted"
                }`}>
                {f.label}
              </button>
            ))}
            <span className="w-px bg-border mx-1" />
            <button onClick={() => setFilterMonth("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterMonth === "all" ? "bg-brand-yellow text-brand-dark" : "bg-surface border border-border text-text-muted"
              }`}>
              Celý rok
            </button>
            {MONTH_NAMES.map((name, idx) => (
              <button key={idx} onClick={() => setFilterMonth(idx)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterMonth === idx ? "bg-brand-yellow text-brand-dark" : "bg-surface border border-border text-text-muted"
                }`}>
                {name.slice(0, 3)}
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

              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                  <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
                </button>
                <button type="button" onClick={resetForm}
                  className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                  <X size={16} /> Zrušit
                </button>
              </div>
            </form>
          )}

          {/* Chronological list */}
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
                  {filteredItems.map((item, idx) => {
                    const isNext = idx === nextIdx;
                    const d = new Date(item.data.date);
                    const h = d.getHours();
                    const m = d.getMinutes();
                    const isAllDay = h === 0 && m === 0;
                    const dateStr = isAllDay
                      ? d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
                      : formatDateTimeCzech(item.data.date);

                    if (item.type === "match") {
                      const match = item.data;
                      const title = match.is_home
                        ? `Dolany - ${match.opponent}`
                        : `${match.opponent} - Dolany`;
                      return (
                        <tr key={`m-${match.id}`} className={`border-t border-border ${isNext ? "bg-brand-red/5 ring-1 ring-inset ring-brand-red/20" : ""}`}>
                          <td className="p-3 text-text-muted whitespace-nowrap">
                            {dateStr}
                            {isNext && <span className="ml-2 text-[10px] font-bold text-brand-red bg-brand-red/10 px-1.5 py-0.5 rounded">další</span>}
                          </td>
                          <td className="p-3 text-text font-medium">{title}</td>
                          <td className="p-3 hidden md:table-cell">
                            <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">Zápas</span>
                          </td>
                          <td className="p-3 text-text-muted hidden md:table-cell">{match.competition || "—"}</td>
                          <td className="p-3 text-text-muted hidden lg:table-cell">{match.venue || "—"}</td>
                          <td className="p-3 text-right text-text-muted text-xs">ze Zápasů</td>
                        </tr>
                      );
                    }

                    const event = item.data;
                    return (
                      <tr key={`e-${event.id}`} className={`border-t border-border ${isNext ? "bg-brand-red/5 ring-1 ring-inset ring-brand-red/20" : ""}`}>
                        <td className="p-3 text-text-muted whitespace-nowrap">
                          {dateStr}
                          {isNext && <span className="ml-2 text-[10px] font-bold text-brand-red bg-brand-red/10 px-1.5 py-0.5 rounded">další</span>}
                        </td>
                        <td className="p-3 text-text font-medium">
                          {event.title}
                          {!event.is_public && <span className="ml-1 text-[10px] text-text-muted">(skrytá)</span>}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${getTypeBadgeStyle(event.event_type)}`}>
                            {getTypeLabel(event.event_type)}
                          </span>
                        </td>
                        <td className="p-3 text-text-muted hidden md:table-cell">{event.organizer || "—"}</td>
                        <td className="p-3 text-text-muted hidden lg:table-cell">{formatLocation(event.location)}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => startEdit(event)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button>
                            <button onClick={() => deleteEvent(event.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-text-muted">Žádné akce pro vybraný filtr</td></tr>
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
            <h2 className="text-xl font-bold text-text">Pravidelné akce v areálu</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                  <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                    <input type="checkbox" checked={scheduleForm.locationAll}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, locationAll: e.target.checked, locations: [] })}
                      className="w-4 h-4 accent-brand-red" />
                    <span className="text-sm text-text font-medium">Celý areál</span>
                  </label>
                  {!scheduleForm.locationAll && (
                    <div className="space-y-1 ml-1">
                      {SCHEDULE_LOCATION_OPTIONS.filter((l) => l.value !== "cely_areal").map((l) => (
                        <label key={l.value} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox"
                            checked={scheduleForm.locations.includes(l.value)}
                            onChange={(e) => {
                              const locs = e.target.checked
                                ? [...scheduleForm.locations, l.value]
                                : scheduleForm.locations.filter((v) => v !== l.value);
                              setScheduleForm({ ...scheduleForm, locations: locs });
                            }}
                            className="w-3.5 h-3.5 accent-brand-red" />
                          <span className="text-sm text-text">{l.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Pořadatel</label>
                  <select
                    value={scheduleForm.organizer}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, organizer: e.target.value, customOrganizer: "" })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
                  >
                    {ORGANIZERS.map((o) => <option key={o} value={o}>{o}</option>)}
                    <option value="__custom__">Jiný...</option>
                  </select>
                  {scheduleForm.organizer === "__custom__" && (
                    <input type="text" value={scheduleForm.customOrganizer} onChange={(e) => setScheduleForm({ ...scheduleForm, customOrganizer: e.target.value })}
                      placeholder="Jméno pořadatele" className="w-full px-3 py-2 mt-2 bg-surface border border-border rounded-lg text-text" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Platnost od</label>
                  <input type="date" value={scheduleForm.valid_from} onChange={(e) => setScheduleForm({ ...scheduleForm, valid_from: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                  <p className="text-xs text-text-muted mt-1">Ponechte prázdné = platí odjakživa</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Platnost do</label>
                  <input type="date" value={scheduleForm.valid_to} onChange={(e) => setScheduleForm({ ...scheduleForm, valid_to: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                  <p className="text-xs text-text-muted mt-1">Ponechte prázdné = platí navždy</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={scheduleSaving}
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                  <Save size={16} /> {scheduleSaving ? "Ukládám..." : "Uložit"}
                </button>
                <button type="button" onClick={resetScheduleForm}
                  className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                  <X size={16} /> Zrušit
                </button>
              </div>
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
                    <th className="text-left p-3 font-semibold text-text hidden md:table-cell">Pořadatel</th>
                    <th className="text-left p-3 font-semibold text-text hidden lg:table-cell">Platnost</th>
                    <th className="text-right p-3 font-semibold text-text">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleEntries.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="p-3 text-text font-medium">{DAY_NAMES[s.day_of_week]}</td>
                      <td className="p-3 text-text">{s.title}</td>
                      <td className="p-3 text-text-muted">{s.time_from}{s.time_to ? ` – ${s.time_to}` : ""}</td>
                      <td className="p-3 text-text-muted hidden md:table-cell">{formatLocation(s.location)}</td>
                      <td className="p-3 text-text-muted hidden md:table-cell">{s.organizer || "—"}</td>
                      <td className="p-3 text-text-muted text-xs hidden lg:table-cell">
                        {s.valid_from || s.valid_to ? (
                          <span>{s.valid_from || "∞"} → {s.valid_to || "∞"}</span>
                        ) : (
                          <span>Vždy</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startScheduleEdit(s)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button>
                          <button onClick={() => deleteScheduleEntry(s.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {scheduleEntries.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-text-muted">Žádné pravidelné akce</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ REQUESTS TAB ═══ */}
      {activeTab === "requests" && (
        <RentalRequestsTab onPendingCountChange={setPendingRequestCount} />
      )}
    </div>
  );
}
