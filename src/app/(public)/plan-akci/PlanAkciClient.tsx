"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, X, MapPin, Clock, Sun } from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { formatDateCzech } from "@/lib/utils";
import RentalRequestForm from "./RentalRequestForm";

interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  end_date?: string | null;
  all_day?: boolean;
  event_type: string;
  location: string | null;
  organizer: string | null;
  is_public?: boolean;
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

// ── Constants ──

const DAY_NAMES = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

const EVENT_TYPE_LABELS: Record<string, string> = {
  akce: "Akce TJ",
  volne: "Ostatní",
  zapas: "Zápas",
  trenink: "Pravidelné akce",
  pronajem: "Soukromá akce",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  akce: "bg-brand-red text-white",
  volne: "bg-cyan-600 text-white",
  zapas: "bg-green-600 text-white",
  trenink: "bg-blue-500 text-white",
  pronajem: "bg-yellow-500 text-black",
};

const EVENT_DOT_COLORS: Record<string, string> = {
  akce: "bg-brand-red",
  volne: "bg-cyan-500",
  zapas: "bg-green-500",
  trenink: "bg-blue-500",
  pronajem: "bg-yellow-500",
};

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const LOCATION_COLORS: Record<string, string> = {
  cely_areal: "bg-purple-500",
  sokolovna: "bg-blue-500",
  kantyna: "bg-orange-500",
  venkovni_cast: "bg-green-500",
  hriste: "bg-rose-500",
};

const LOCATION_LABELS: Record<string, string> = {
  cely_areal: "Celý areál",
  sokolovna: "Sokolovna",
  kantyna: "Kantýna",
  venkovni_cast: "Venkovní část",
  hriste: "Hřiště",
};

type CalendarFilter = "all" | "akce" | "volne" | "pronajem";

const CALENDAR_FILTERS: { value: CalendarFilter; label: string }[] = [
  { value: "all", label: "Vše" },
  { value: "akce", label: "TJ Dolany" },
  { value: "volne", label: "Ostatní" },
  { value: "pronajem", label: "Soukromé" },
];

// ── Helpers ──

function formatLocationBadges(loc: string | null, eventType?: string) {
  // Football events default to celý areál
  if (!loc && (eventType === "zapas" || eventType === "trenink")) {
    return [{ value: "cely_areal", label: LOCATION_LABELS["cely_areal"], color: LOCATION_COLORS["cely_areal"] }];
  }
  if (!loc) return null;
  if (loc === "cely_areal") {
    return [{ value: "cely_areal", label: LOCATION_LABELS["cely_areal"], color: LOCATION_COLORS["cely_areal"] }];
  }
  return loc.split(",")
    .filter((v) => LOCATION_COLORS[v.trim()])
    .map((v) => ({
      value: v.trim(),
      label: LOCATION_LABELS[v.trim()] || v.trim(),
      color: LOCATION_COLORS[v.trim()],
    }));
}

function LocationLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Místo:</span>
      {Object.entries(LOCATION_LABELS).map(([value, label]) => (
        <span key={value} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className={`w-2 h-2 rounded-full ${LOCATION_COLORS[value]}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function OccupiedLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Den:</span>
      <span className="flex items-center gap-1.5 text-xs text-text-muted">
        <span className="w-4 h-4 rounded bg-brand-red/15 border border-brand-red/30" />
        Obsazeno (celodenní akce / zápas)
      </span>
      <span className="flex items-center gap-1.5 text-xs text-text-muted">
        <span className="w-4 h-4 rounded bg-brand-yellow/10 border border-brand-yellow/30" />
        Dnes
      </span>
    </div>
  );
}

function EventTypeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Typ:</span>
      {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
        <span key={value} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className={`w-0.5 h-3 rounded-full ${EVENT_DOT_COLORS[value]}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ──

export default function PlanAkciClient({
  upcoming,
  allEvents,
  schedule,
}: {
  upcoming: CalEvent[];
  allEvents: CalEvent[];
  schedule: ScheduleEntry[];
}) {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calFilter, setCalFilter] = useState<CalendarFilter>("all");

  // Find the next upcoming event date
  const nextEventDate = upcoming.length > 0 ? new Date(upcoming[0].date) : null;

  // Calendar helpers
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  // Generate virtual calendar events from weekly schedule
  function getScheduleEventsForMonth(month: number, year: number): CalEvent[] {
    const virtual: CalEvent[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dow = date.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      for (const s of schedule) {
        if (s.day_of_week !== dow) continue;
        // Check valid_from / valid_to
        if (s.valid_from && dateStr < s.valid_from) continue;
        if (s.valid_to && dateStr > s.valid_to) continue;
        virtual.push({
          id: `sched-${s.id}-${dateStr}`,
          title: s.title,
          description: null,
          date: `${dateStr}T${s.time_from}`,
          end_date: s.time_to ? `${dateStr}T${s.time_to}` : null,
          all_day: false,
          event_type: "trenink",
          location: s.location,
          organizer: s.organizer,
        });
      }
    }
    return virtual;
  }

  const scheduleVirtualEvents = getScheduleEventsForMonth(calMonth, calYear);

  // Filter events for calendar — only home matches (title starts with "Dolany")
  const filteredCalEvents = allEvents.filter((e) => {
    if (e.event_type === "zapas" && !e.title.toLowerCase().startsWith("dolany")) return false;
    if (calFilter === "all") return true;
    if (calFilter === "akce") return e.event_type === "akce" || e.event_type === "zapas" || e.event_type === "trenink";
    if (calFilter === "volne") return e.event_type === "volne";
    if (calFilter === "pronajem") return e.event_type === "pronajem";
    return true;
  });

  // Merge real events + schedule virtual events for the current month
  const allMonthEvents = [
    ...filteredCalEvents.filter((e) => {
      const d = new Date(e.date);
      const ed = e.end_date ? new Date(e.end_date) : null;
      // Include if event starts in this month OR spans into this month
      const monthStart = new Date(calYear, calMonth, 1);
      const monthEnd = new Date(calYear, calMonth + 1, 0);
      const startsInMonth = d.getMonth() === calMonth && d.getFullYear() === calYear;
      const spansIntoMonth = ed && d < monthStart && ed >= monthStart;
      return startsInMonth || spansIntoMonth;
    }),
    ...(calFilter === "all" || calFilter === "akce" ? scheduleVirtualEvents : []),
  ];

  const eventsByDay: Record<number, CalEvent[]> = {};
  for (const e of allMonthEvents) {
    const startDate = new Date(e.date);
    const endDate = e.end_date ? new Date(e.end_date) : startDate;
    // For multi-day events, add to each day in the range within this month
    const monthStart = new Date(calYear, calMonth, 1);
    const monthEnd = new Date(calYear, calMonth + 1, 0);
    const rangeStart = startDate < monthStart ? monthStart : startDate;
    const rangeEnd = endDate > monthEnd ? monthEnd : endDate;
    const current = new Date(rangeStart);
    while (current <= rangeEnd) {
      if (current.getMonth() === calMonth && current.getFullYear() === calYear) {
        const day = current.getDate();
        if (!eventsByDay[day]) eventsByDay[day] = [];
        // Avoid duplicates for same event on same day
        if (!eventsByDay[day].some((x) => x.id === e.id)) {
          eventsByDay[day].push(e);
        }
      }
      current.setDate(current.getDate() + 1);
    }
  }
  // Sort events within each day by time
  for (const day in eventsByDay) {
    eventsByDay[day].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  const selectedEvents = selectedDay
    ? (() => {
        const dayScheduleEvents = getScheduleEventsForMonth(selectedDay.getMonth(), selectedDay.getFullYear())
          .filter((e) => new Date(e.date).getDate() === selectedDay.getDate());
        const dayRealEvents = filteredCalEvents.filter((e) => {
          const d = new Date(e.date);
          return (
            d.getDate() === selectedDay.getDate() &&
            d.getMonth() === selectedDay.getMonth() &&
            d.getFullYear() === selectedDay.getFullYear()
          );
        });
        const merged = [
          ...dayRealEvents,
          ...(calFilter === "all" || calFilter === "akce" ? dayScheduleEvents : []),
        ];
        return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      })()
    : [];

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
    setSelectedDay(null);
  }

  return (
    <div>
      <div className="bg-surface-alt">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
            <span className="w-1 h-5 bg-brand-red rounded-full" />Kalendář akcí a zápasů
          </p>
          <h1 className="text-4xl font-extrabold text-text tracking-tight">Plán akcí a zápasů TJ Dolany</h1>
        </motion.div>
      </div>
      </div>

      {/* Section navigation — sticky */}
      <div className="sticky top-16 z-30 bg-surface-muted/95 backdrop-blur-sm py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2">
            {[
              ...(upcoming.length > 0 ? [{ id: "nadchazejici", label: "Nadcházející" }] : []),
              { id: "kalendar", label: "Kalendář" },
              { id: "zadost", label: "Žádost o akci" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* ═══ UPCOMING EVENTS (TJ Dolany only) ═══ */}
      {upcoming.length > 0 && (
        <div className="bg-surface py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <h2 id="nadchazejici" className="scroll-mt-24 text-2xl font-bold text-text tracking-tight mb-8 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Nadcházející akce TJ Dolany
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {upcoming.map((event, idx) => {
              const d = new Date(event.date);
              const h = d.getHours();
              const m = d.getMinutes();
              const isAllDay = h === 0 && m === 0;
              const isFirst = idx === 0;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`w-full sm:w-48 text-center rounded-2xl p-5 border transition-all duration-300 ${
                    isFirst
                      ? "bg-brand-red/10 border-brand-red/40 shadow-lg shadow-brand-red/10 ring-2 ring-brand-red/20"
                      : "bg-surface-alt border-border-strong shadow-sm hover:shadow-lg hover:border-brand-red/40 hover:-translate-y-1"
                  }`}
                >
                  {isFirst && (
                    <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider">
                      Příští akce
                    </span>
                  )}
                  <div className={`w-10 h-10 mx-auto mb-2 mt-1 rounded-full flex items-center justify-center ${
                    isFirst ? "bg-brand-red/20" : "bg-brand-red/10"
                  }`}>
                    <Calendar size={18} className="text-brand-red" />
                  </div>
                  <span className="text-lg font-bold text-brand-red">
                    {d.getDate()}.{d.getMonth() + 1}.
                  </span>
                  {!isAllDay && (
                    <span className="text-xs text-text-muted ml-1">
                      {h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}
                    </span>
                  )}
                  <h3 className="font-semibold text-text text-sm leading-snug mt-2 line-clamp-2">
                    {event.title}
                  </h3>
                  <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    EVENT_TYPE_COLORS[event.event_type] ?? "bg-gray-200 text-gray-700"
                  }`}>
                    {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </AnimatedSection>
        </div>
        </div>
      )}

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* ═══ CALENDAR — Kalendář akcí sportovního areálu Dolany ═══ */}
      <div className="bg-surface-alt py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection>
        <h2 id="kalendar" className="scroll-mt-24 text-2xl font-bold text-text tracking-tight mb-6 flex items-center justify-center gap-3">
          <span className="w-8 h-0.5 bg-brand-red rounded-full" />
          Kalendář akcí sportovního areálu Dolany
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {CALENDAR_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCalFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                calFilter === f.value
                  ? "bg-brand-red text-white"
                  : "bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-text">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-xl font-bold text-text">
            {MONTH_NAMES[calMonth]} {calYear}
            {calMonth === now.getMonth() && calYear === now.getFullYear() && (
              <span className="ml-2 text-xs font-semibold bg-brand-red text-white px-2 py-0.5 rounded-full">
                aktuální
              </span>
            )}
          </h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-text">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="bg-surface rounded-xl border border-border-strong overflow-hidden">
          <div className="grid grid-cols-7 bg-surface-alt border-b border-border">
            {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => (
              <div key={d} className="text-center py-2 text-xs font-bold text-text-muted uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-border bg-surface-alt/30" />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsByDay[day] ?? [];
              const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
              const isSelected = selectedDay && day === selectedDay.getDate() && calMonth === selectedDay.getMonth() && calYear === selectedDay.getFullYear();
              const isNextEvent = nextEventDate && day === nextEventDate.getDate() && calMonth === nextEventDate.getMonth() && calYear === nextEventDate.getFullYear();
              // Check if day is occupied (all-day event or match)
              const isOccupied = dayEvents.some((e) => {
                const ed = new Date(e.date);
                const isAllDay = e.all_day || (ed.getHours() === 0 && ed.getMinutes() === 0 && e.event_type !== "trenink");
                return isAllDay || e.event_type === "zapas";
              });

              return (
                <button
                  key={day}
                  onClick={() => {
                    if (dayEvents.length > 0) setSelectedDay(new Date(calYear, calMonth, day));
                  }}
                  className={`min-h-[80px] border-b border-r border-border p-1.5 text-left transition-colors ${
                    dayEvents.length > 0 ? "cursor-pointer hover:bg-brand-red/5" : "cursor-default"
                  } ${isSelected ? "bg-brand-red/10 ring-2 ring-inset ring-brand-red/30" : ""} ${
                    isToday ? "bg-brand-yellow/10" : ""
                  } ${isOccupied && !isSelected && !isToday ? "bg-brand-red/15" : ""} ${
                    isNextEvent && !isSelected ? "bg-brand-red/5" : ""}`}
                >
                  <span className={`text-sm font-semibold ${
                    isToday
                      ? "bg-brand-red text-white w-6 h-6 rounded-full flex items-center justify-center"
                      : "text-text"
                  }`}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => {
                        const locBadges = formatLocationBadges(e.location, e.event_type);
                        const ed = new Date(e.date);
                        const eh = ed.getHours();
                        const em = ed.getMinutes();
                        const isAllDay = e.all_day || (eh === 0 && em === 0);
                        const timeStr = isAllDay ? "" : `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")} `;
                        return (
                          <div key={e.id} className="flex items-center gap-1">
                            <div className={`w-0.5 h-3 shrink-0 rounded-full ${EVENT_DOT_COLORS[e.event_type] ?? "bg-gray-400"}`} />
                            <span className="text-[10px] text-text leading-tight truncate flex-1">
                              {timeStr}{e.title}
                            </span>
                            {locBadges && locBadges.map((b) => (
                              <span key={b.value} className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.color}`} title={b.label} />
                            ))}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-text-muted">+{dayEvents.length - 3} další</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legends */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-8">
          <EventTypeLegend />
          <LocationLegend />
          <OccupiedLegend />
        </div>

        {/* Selected day detail */}
        <AnimatePresence>
          {selectedDay && selectedEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 bg-surface rounded-xl border border-border-strong shadow-lg p-6 relative"
            >
              <button
                onClick={() => setSelectedDay(null)}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-surface-alt text-text-muted"
              >
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-text mb-4">
                {formatDateCzech(selectedDay.toISOString())}
              </h3>
              <div className="space-y-4">
                {selectedEvents.map((event) => {
                  const d = new Date(event.date);
                  const h = d.getHours();
                  const m = d.getMinutes();
                  const isAllDay = event.all_day || (h === 0 && m === 0);
                  const timeFrom = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                  let timeDisplay = timeFrom;
                  if (event.end_date) {
                    const ed = new Date(event.end_date);
                    const edDate = event.end_date.slice(0, 10);
                    const startDate = event.date.slice(0, 10);
                    if (edDate === startDate && !isAllDay) {
                      // Same day, time range
                      timeDisplay = `${timeFrom} – ${ed.getHours().toString().padStart(2, "0")}:${ed.getMinutes().toString().padStart(2, "0")}`;
                    } else if (edDate !== startDate) {
                      // Multi-day
                      timeDisplay = isAllDay
                        ? `${formatDateCzech(event.date)} – ${formatDateCzech(event.end_date)}`
                        : `${timeFrom} – ${formatDateCzech(event.end_date)}`;
                    }
                  }
                  const locBadges = formatLocationBadges(event.location, event.event_type);
                  const isMultiDay = event.end_date && event.end_date.slice(0, 10) !== event.date.slice(0, 10);
                  return (
                    <div
                      key={event.id}
                      className={`flex gap-4 items-start p-4 bg-surface-alt rounded-lg border border-border ${isMultiDay ? "border-l-4 border-l-brand-red/50" : ""}`}
                    >
                      <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        EVENT_TYPE_COLORS[event.event_type] ?? "bg-gray-200 text-gray-700"
                      }`}>
                        {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-text">{event.title}</h4>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-text-muted">
                          {isAllDay && !isMultiDay ? (
                            <span className="flex items-center gap-1"><Sun size={12} /> Celý den</span>
                          ) : isMultiDay && isAllDay ? (
                            <span className="flex items-center gap-1"><Calendar size={12} /> {timeDisplay}</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock size={12} /> {timeDisplay}</span>
                          )}
                          {locBadges && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={12} />
                              {locBadges.map((b) => (
                                <span key={b.value} className="flex items-center gap-1">
                                  <span className={`w-2 h-2 rounded-full ${b.color}`} />
                                  {b.label}
                                </span>
                              ))}
                            </span>
                          )}
                          {event.organizer && (
                            <span>Pořadatel: {event.organizer}</span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-text-muted mt-2">{event.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatedSection>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      <div className="bg-surface py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div id="zadost" className="scroll-mt-24">
        <RentalRequestForm allEvents={allEvents} schedule={schedule} />
      </div>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
    </div>
  );
}
