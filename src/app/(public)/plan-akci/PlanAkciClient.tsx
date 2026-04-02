"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, X, MapPin, Clock, Sun } from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { formatDateCzech, LOCATION_LABELS } from "@/lib/utils";

interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  event_type: string;
  location: string | null;
  organizer: string | null;
}

interface ScheduleEntry {
  id: string;
  day_of_week: number;
  title: string;
  time_from: string;
  time_to: string | null;
  location: string | null;
}

const DAY_NAMES = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

const EVENT_TYPE_LABELS: Record<string, string> = {
  akce: "Akce TJ",
  volne: "Ostatní",
  zapas: "Zápas",
  trenink: "Trénink",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  akce: "bg-brand-red text-white",
  volne: "bg-gray-500 text-white",
  zapas: "bg-green-600 text-white",
  trenink: "bg-blue-500 text-white",
};

const EVENT_DOT_COLORS: Record<string, string> = {
  akce: "bg-brand-red",
  volne: "bg-gray-400",
  zapas: "bg-green-500",
  trenink: "bg-blue-500",
};

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function formatLocationLabel(loc: string | null): string {
  if (!loc) return "";
  if (loc === "cely_areal") return LOCATION_LABELS["cely_areal"] || "Celý areál";
  return loc.split(",").map((v) => LOCATION_LABELS[v.trim()] || v.trim()).join(", ");
}

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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Group schedule by day
  const scheduleByDay = DAY_NAMES.map((name, idx) => ({
    name,
    entries: schedule
      .filter((s) => s.day_of_week === idx)
      .sort((a, b) => a.time_from.localeCompare(b.time_from)),
  }));

  // Find the next upcoming event (for highlighting)
  const nextEventDate = upcoming.length > 0 ? new Date(upcoming[0].date) : null;

  // Generate months to display: current month + next 11 months
  const months: { month: number; year: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ month: d.getMonth(), year: d.getFullYear() });
  }

  // Events for selected day
  const selectedEvents = selectedDay
    ? allEvents.filter((e) => {
        const d = new Date(e.date);
        return (
          d.getDate() === selectedDay.getDate() &&
          d.getMonth() === selectedDay.getMonth() &&
          d.getFullYear() === selectedDay.getFullYear()
        );
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2">
          Kalendář akcí
        </p>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">Plán akcí</h1>
      </motion.div>

      {/* ── UPCOMING EVENTS ── */}
      {upcoming.length > 0 && (
        <AnimatedSection className="mb-16">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-8 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Nadcházející akce
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {upcoming.map((event, idx) => {
              const d = new Date(event.date);
              const h = d.getHours();
              const m = d.getMinutes();
              const isAllDay = h === 0 && m === 0;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`w-full sm:w-56 text-center rounded-2xl p-5 border transition-all duration-300 ${
                    idx === 0
                      ? "bg-brand-red/10 border-brand-red/40 shadow-lg shadow-brand-red/10 ring-2 ring-brand-red/20"
                      : "bg-surface-alt border-border-strong shadow-sm hover:shadow-lg hover:border-brand-red/40 hover:-translate-y-1"
                  }`}
                >
                  {idx === 0 && (
                    <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider">
                      Příští akce
                    </span>
                  )}
                  <div
                    className={`w-10 h-10 mx-auto mb-2 mt-1 rounded-full flex items-center justify-center ${
                      idx === 0 ? "bg-brand-red/20" : "bg-brand-red/10"
                    }`}
                  >
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
                  <span
                    className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      EVENT_TYPE_COLORS[event.event_type] ?? "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </AnimatedSection>
      )}

      {/* ── divider ── */}
      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent mb-12" />

      {/* ── WEEKLY SCHEDULE ── */}
      {schedule.length > 0 && (
        <AnimatedSection className="mb-16">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-8 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Pravidelné akce v sokolovně — tělocvična
          </h2>
          <div className="bg-surface rounded-xl border border-border-strong overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-border">
              {scheduleByDay.map(({ name, entries }, idx) => (
                <div key={idx} className="min-h-[80px]">
                  <div className="bg-surface-alt px-3 py-2 border-b border-border">
                    <span className="text-xs font-bold text-text uppercase tracking-wider">
                      {name}
                    </span>
                  </div>
                  <div className="px-3 py-2 space-y-2">
                    {entries.length > 0 ? (
                      entries.map((entry) => (
                        <div key={entry.id} className="text-xs">
                          <span className="font-semibold text-brand-red">
                            {entry.time_from}
                            {entry.time_to ? `–${entry.time_to}` : ""}
                          </span>
                          <p className="text-text leading-tight mt-0.5">{entry.title}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-text-muted italic">—</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ── divider ── */}
      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent mb-12" />

      {/* ── ALL MONTHS CHRONOLOGICALLY ── */}
      <AnimatedSection>
        <h2 className="text-2xl font-bold text-text tracking-tight mb-8 flex items-center gap-3">
          <span className="w-8 h-0.5 bg-brand-red rounded-full" />
          Kalendář
        </h2>

        <div className="space-y-10">
          {months.map(({ month, year }) => {
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startPad = (firstDay.getDay() + 6) % 7;
            const totalDays = lastDay.getDate();

            const eventsForMonth = allEvents.filter((e) => {
              const d = new Date(e.date);
              return d.getMonth() === month && d.getFullYear() === year;
            });

            const eventsByDay: Record<number, CalEvent[]> = {};
            for (const e of eventsForMonth) {
              const day = new Date(e.date).getDate();
              if (!eventsByDay[day]) eventsByDay[day] = [];
              eventsByDay[day].push(e);
            }

            const isCurrentMonth =
              month === now.getMonth() && year === now.getFullYear();

            return (
              <div key={`${year}-${month}`}>
                <h3 className={`text-lg font-bold mb-3 ${isCurrentMonth ? "text-brand-red" : "text-text"}`}>
                  {MONTH_NAMES[month]} {year}
                  {isCurrentMonth && (
                    <span className="ml-2 text-xs font-semibold bg-brand-red text-white px-2 py-0.5 rounded-full">
                      aktuální
                    </span>
                  )}
                </h3>
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
                      <div
                        key={`pad-${i}`}
                        className="min-h-[70px] border-b border-r border-border bg-surface-alt/30"
                      />
                    ))}
                    {Array.from({ length: totalDays }).map((_, i) => {
                      const day = i + 1;
                      const dayEvents = eventsByDay[day] ?? [];
                      const isToday =
                        day === now.getDate() && isCurrentMonth;
                      const isSelected =
                        selectedDay &&
                        day === selectedDay.getDate() &&
                        month === selectedDay.getMonth() &&
                        year === selectedDay.getFullYear();

                      // Check if any event on this day is the next upcoming event
                      const isNextEvent =
                        nextEventDate &&
                        day === nextEventDate.getDate() &&
                        month === nextEventDate.getMonth() &&
                        year === nextEventDate.getFullYear();

                      return (
                        <button
                          key={day}
                          onClick={() => {
                            if (dayEvents.length > 0) {
                              setSelectedDay(new Date(year, month, day));
                            }
                          }}
                          className={`min-h-[70px] border-b border-r border-border p-1.5 text-left transition-colors ${
                            dayEvents.length > 0
                              ? "cursor-pointer hover:bg-brand-red/5"
                              : "cursor-default"
                          } ${
                            isSelected
                              ? "bg-brand-red/10 ring-2 ring-inset ring-brand-red/30"
                              : ""
                          } ${isToday ? "bg-brand-yellow/10" : ""} ${
                            isNextEvent && !isSelected
                              ? "bg-brand-red/5 ring-2 ring-inset ring-brand-red/20"
                              : ""
                          }`}
                        >
                          <span
                            className={`text-sm font-semibold ${
                              isToday
                                ? "bg-brand-red text-white w-6 h-6 rounded-full flex items-center justify-center"
                                : "text-text"
                            }`}
                          >
                            {day}
                          </span>
                          {dayEvents.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {dayEvents.slice(0, 3).map((e) => (
                                <div key={e.id} className="flex items-center gap-1">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      EVENT_DOT_COLORS[e.event_type] ?? "bg-gray-400"
                                    }`}
                                  />
                                  <span className="text-[10px] text-text leading-tight truncate">
                                    {e.title}
                                  </span>
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[9px] text-text-muted">
                                  +{dayEvents.length - 3} další
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected day detail modal */}
        <AnimatePresence>
          {selectedDay && selectedEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 bg-surface rounded-xl border border-border-strong shadow-lg p-6 relative sticky bottom-4"
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
                  return (
                    <div
                      key={event.id}
                      className="flex gap-4 items-start p-4 bg-surface-alt rounded-lg border border-border"
                    >
                      <div
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          EVENT_TYPE_COLORS[event.event_type] ?? "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-text">{event.title}</h4>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-text-muted">
                          {isAllDay ? (
                            <span className="flex items-center gap-1">
                              <Sun size={12} /> Celý den
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {time}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {formatLocationLabel(event.location)}
                            </span>
                          )}
                          {event.organizer && (
                            <span className="text-text-muted">
                              Pořadatel: {event.organizer}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-text-muted mt-2">
                            {event.description}
                          </p>
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
  );
}
