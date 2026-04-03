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
  trenink: "Trénink",
  pronajem: "Soukromá akce",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  akce: "bg-brand-red text-white",
  volne: "bg-gray-500 text-white",
  zapas: "bg-green-600 text-white",
  trenink: "bg-blue-500 text-white",
  pronajem: "bg-yellow-500 text-black",
};

const EVENT_DOT_COLORS: Record<string, string> = {
  akce: "bg-brand-red",
  volne: "bg-gray-400",
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
  hriste: "bg-emerald-600",
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

function formatLocationBadges(loc: string | null) {
  if (!loc) return null;
  if (loc === "cely_areal") {
    return [{ value: "cely_areal", label: LOCATION_LABELS["cely_areal"], color: LOCATION_COLORS["cely_areal"] }];
  }
  return loc.split(",").map((v) => ({
    value: v.trim(),
    label: LOCATION_LABELS[v.trim()] || v.trim(),
    color: LOCATION_COLORS[v.trim()] || "bg-gray-400",
  }));
}

function LocationLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Místo:</span>
      {Object.entries(LOCATION_LABELS).map(([value, label]) => (
        <span key={value} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className={`w-3 h-2 rounded-sm ${LOCATION_COLORS[value]}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function EventTypeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Typ:</span>
      {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
        <span key={value} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className={`w-2 h-2 rounded-full ${EVENT_DOT_COLORS[value]}`} />
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
          event_type: "trenink",
          location: s.location,
          organizer: s.organizer,
        });
      }
    }
    return virtual;
  }

  const scheduleVirtualEvents = getScheduleEventsForMonth(calMonth, calYear);

  // Filter events for calendar
  const filteredCalEvents = allEvents.filter((e) => {
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
      return d.getMonth() === calMonth && d.getFullYear() === calYear;
    }),
    ...(calFilter === "all" || calFilter === "akce" ? scheduleVirtualEvents : []),
  ];

  const eventsByDay: Record<number, CalEvent[]> = {};
  for (const e of allMonthEvents) {
    const day = new Date(e.date).getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(e);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

      {/* ═══ UPCOMING EVENTS (TJ Dolany only) ═══ */}
      {upcoming.length > 0 && (
        <AnimatedSection className="mb-16">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-8 flex items-center justify-center gap-3">
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
      )}

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent mb-12" />

      {/* ═══ CALENDAR — Kalendář Areálu TJ Dolany ═══ */}
      <AnimatedSection>
        <h2 className="text-2xl font-bold text-text tracking-tight mb-6 flex items-center justify-center gap-3">
          <span className="w-8 h-0.5 bg-brand-red rounded-full" />
          Kalendář Areálu TJ Dolany
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
                  } ${isNextEvent && !isSelected ? "bg-brand-red/5" : ""}`}
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
                        const locBadges = formatLocationBadges(e.location);
                        return (
                          <div key={e.id} className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_DOT_COLORS[e.event_type] ?? "bg-gray-400"}`} />
                            <span className="text-[10px] text-text leading-tight truncate flex-1">
                              {e.title}
                            </span>
                            {locBadges && locBadges.slice(0, 1).map((b) => (
                              <span key={b.value} className={`w-2 h-1.5 rounded-sm shrink-0 ${b.color}`} title={b.label} />
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
        <div className="flex flex-col sm:flex-row sm:gap-8">
          <EventTypeLegend />
          <LocationLegend />
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
                  const isAllDay = h === 0 && m === 0;
                  const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                  const locBadges = formatLocationBadges(event.location);
                  return (
                    <div
                      key={event.id}
                      className="flex gap-4 items-start p-4 bg-surface-alt rounded-lg border border-border"
                    >
                      <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        EVENT_TYPE_COLORS[event.event_type] ?? "bg-gray-200 text-gray-700"
                      }`}>
                        {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-text">{event.title}</h4>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-text-muted">
                          {isAllDay ? (
                            <span className="flex items-center gap-1"><Sun size={12} /> Celý den</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
                          )}
                          {locBadges && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={12} />
                              {locBadges.map((b) => (
                                <span key={b.value} className="flex items-center gap-1">
                                  <span className={`w-2.5 h-1.5 rounded-sm ${b.color}`} />
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

      <RentalRequestForm />
    </div>
  );
}
