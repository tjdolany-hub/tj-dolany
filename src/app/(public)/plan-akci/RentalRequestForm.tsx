"use client";

import { useState, useMemo } from "react";
import { Send, CheckCircle, AlertTriangle, Info } from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { isMidnightPrague } from "@/lib/utils";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  end_date?: string | null;
  all_day?: boolean;
  event_type: string;
}

interface ScheduleEntry {
  day_of_week: number;
  title: string;
  time_from: string;
  time_to: string | null;
  valid_from: string | null;
  valid_to: string | null;
}

const ORGANIZERS = ["TJ Dolany", "Obec Dolany", "DS Dolany", "SDH Dolany"] as const;

const LOCATION_OPTIONS = [
  { value: "sokolovna", label: "Sokolovna" },
  { value: "kantyna", label: "Kantýna" },
  { value: "venkovni_cast", label: "Venkovní část" },
  { value: "hriste", label: "Hřiště" },
] as const;

const DEFAULT_FORM = {
  event_type: "pronajem" as "pronajem" | "volne",
  event_name: "",
  organizer: "TJ Dolany",
  customOrganizer: "",
  pronajemName: "",
  is_public: false,
  date: "",
  end_date: "",
  time: "",
  time_to: "",
  allDay: false,
  multiDay: false,
  locationAll: false,
  locations: [] as string[],
  contact_name: "",
  contact_phone: "+420 ",
  contact_email: "",
  description: "",
  note: "",
};

export default function RentalRequestForm({
  allEvents = [],
  schedule = [],
}: {
  allEvents?: CalEvent[];
  schedule?: ScheduleEntry[];
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | "rate-limit" | null>(null);

  // Contact is required for pronajem always, for volne only when organizer is custom
  const isCustomOrganizer = form.organizer === "__custom__";
  const contactRequired = form.event_type === "pronajem" || isCustomOrganizer;

  // Check for conflicts on selected date+time
  const dateConflicts = useMemo(() => {
    if (!form.date) return [];
    const conflicts: string[] = [];
    const selectedDate = form.date;
    const reqFrom = form.time || null;
    const reqTo = form.time_to || null;
    const reqAllDay = form.allDay;

    // Helper: do two time ranges overlap? (HH:MM strings)
    const timesOverlap = (aFrom: string | null, aTo: string | null, bFrom: string | null, bTo: string | null): boolean => {
      // If either side is all-day (no times), it always overlaps
      if (!aFrom || !bFrom) return true;
      const aEnd = aTo || "23:59";
      const bEnd = bTo || "23:59";
      return aFrom < bEnd && bFrom < aEnd;
    };

    // Check calendar events
    for (const e of allEvents) {
      const eventDate = e.date.slice(0, 10);
      const endDate = e.end_date ? e.end_date.slice(0, 10) : eventDate;
      if (selectedDate >= eventDate && selectedDate <= endDate) {
        const d = new Date(e.date);
        const isEventAllDay = e.all_day || (isMidnightPrague(d) && e.event_type !== "trenink");
        if (isEventAllDay || e.event_type === "zapas") {
          conflicts.push(e.title);
        } else if (!reqAllDay) {
          // Both have times — check overlap
          const evFrom = e.date.slice(11, 16);
          const evTo = e.end_date ? e.end_date.slice(11, 16) : null;
          if (timesOverlap(reqFrom, reqTo, evFrom, evTo)) {
            conflicts.push(e.title);
          }
        }
      }
    }

    // Check weekly schedule — only if times overlap
    const dow = new Date(selectedDate).getDay();
    for (const s of schedule) {
      if (s.day_of_week !== dow) continue;
      if (s.valid_from && selectedDate < s.valid_from) continue;
      if (s.valid_to && selectedDate > s.valid_to) continue;
      if (reqAllDay) {
        conflicts.push(s.title);
      } else {
        if (timesOverlap(reqFrom, reqTo, s.time_from, s.time_to)) {
          conflicts.push(s.title);
        }
      }
    }

    return conflicts;
  }, [form.date, form.time, form.time_to, form.allDay, allEvents, schedule]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitting(true);
    setResult(null);

    const location = form.locationAll ? "cely_areal" : form.locations.join(",");
    const organizer =
      form.event_type === "pronajem"
        ? form.pronajemName || null
        : form.organizer === "__custom__"
          ? form.customOrganizer
          : form.organizer;

    const body = {
      event_type: form.event_type,
      event_name: form.event_type === "volne" ? form.event_name || null : null,
      organizer: organizer || null,
      is_public: form.is_public,
      location: location || "cely_areal",
      date: form.date,
      end_date: form.end_date || null,
      time: form.allDay ? null : form.time || null,
      time_to: form.allDay ? null : form.time_to || null,
      all_day: form.allDay,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      description: form.description || null,
      note: form.note || null,
    };

    try {
      const res = await fetch("/api/rental-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        setResult("rate-limit");
      } else if (res.ok) {
        setResult("success");
        setForm(DEFAULT_FORM);
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red";

  return (
    <AnimatedSection className="mt-16">
      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent mb-12" />

      <h2 className="text-2xl font-bold text-text tracking-tight mb-6 flex items-center justify-center gap-3">
        <span className="w-8 h-0.5 bg-brand-red rounded-full" />
        Žádost o akci v areálu
      </h2>

      {/* Info banner */}
      <div className="max-w-2xl mx-auto mb-8 flex items-start gap-3 bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl p-4">
        <Info size={20} className="text-brand-yellow shrink-0 mt-0.5" />
        <div className="text-sm text-text space-y-1">
          <p><strong>Pouze pro občany obce Dolany u Jaroměře.</strong> Žádost odešlete až po dohodnutí s Obcí Dolany na podmínkách pronájmu. Nejprve si zkontrolujte, že je termín volný.</p>
          <p>Pokud není známý los fotbalu, je nutno počítat s tím, že termín bude definitivně potvrzený až po losu.</p>
          <p>O výsledku budete informováni emailem.</p>
        </div>
      </div>

      {/* Success / Error states */}
      {result === "success" && (
        <div className="max-w-2xl mx-auto mb-6 flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <CheckCircle size={20} className="text-green-500 shrink-0" />
          <p className="text-sm text-text">
            <strong>Žádost odeslána!</strong> O schválení nebo zamítnutí vás budeme informovat na zadaný email.
          </p>
        </div>
      )}
      {result === "error" && (
        <div className="max-w-2xl mx-auto mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <p className="text-sm text-text">
            <strong>Chyba při odesílání.</strong> Zkuste to prosím znovu nebo nás kontaktujte přímo.
          </p>
        </div>
      )}
      {result === "rate-limit" && (
        <div className="max-w-2xl mx-auto mb-6 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <AlertTriangle size={20} className="text-yellow-500 shrink-0" />
          <p className="text-sm text-text">
            <strong>Příliš mnoho žádostí.</strong> Zkuste to prosím za hodinu.
          </p>
        </div>
      )}

      {result !== "success" && (
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto bg-surface rounded-xl border border-border-strong p-6 space-y-5"
        >
          {/* Event type */}
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Typ akce</label>
            <select
              value={form.event_type}
              onChange={(e) => {
                const val = e.target.value as "pronajem" | "volne";
                setForm({
                  ...form,
                  event_type: val,
                  event_name: "",
                  organizer: "TJ Dolany",
                  customOrganizer: "",
                  pronajemName: "",
                  is_public: false,
                  locationAll: false,
                  locations: [],
                });
              }}
              className={inputClass}
            >
              <option value="pronajem">Soukromá akce</option>
              <option value="volne">Ostatní</option>
            </select>
          </div>

          {/* Fields for "pronajem" type */}
          {form.event_type === "pronajem" && (
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Pořadatel (Jméno)</label>
              <input
                type="text"
                value={form.pronajemName}
                onChange={(e) => setForm({ ...form, pronajemName: e.target.value })}
                required
                maxLength={100}
                placeholder="Vaše jméno"
                className={inputClass}
              />
            </div>
          )}

          {/* Fields for "volne" type */}
          {form.event_type === "volne" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Název akce</label>
                <input
                  type="text"
                  value={form.event_name}
                  onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                  required
                  maxLength={100}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Pořadatel</label>
                <select
                  value={form.organizer}
                  onChange={(e) =>
                    setForm({ ...form, organizer: e.target.value, customOrganizer: "" })
                  }
                  className={inputClass}
                >
                  {ORGANIZERS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                  <option value="__custom__">Jiný...</option>
                </select>
                {isCustomOrganizer && (
                  <input
                    type="text"
                    value={form.customOrganizer}
                    onChange={(e) => setForm({ ...form, customOrganizer: e.target.value })}
                    placeholder="Jméno pořadatele"
                    required
                    className={`${inputClass} mt-2`}
                  />
                )}
              </div>
            </>
          )}

          {/* Veřejná — only for "volne" type */}
          {form.event_type === "volne" && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  className="w-4 h-4 accent-brand-red"
                />
                <span className="text-sm font-semibold text-text">Veřejná akce</span>
              </label>
              <p className="text-xs text-text-muted mt-1 ml-6">
                Akce určená pro širokou veřejnost.
              </p>
            </div>
          )}

          {/* Duration toggle */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm({ ...form, multiDay: false, end_date: "" })}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${!form.multiDay ? "bg-brand-red text-white" : "bg-surface border border-border text-text-muted hover:text-text"}`}>
              Jednodenní
            </button>
            <button type="button" onClick={() => setForm({ ...form, multiDay: true })}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${form.multiDay ? "bg-brand-red text-white" : "bg-surface border border-border text-text-muted hover:text-text"}`}>
              Vícedenní
            </button>
          </div>

          {!form.multiDay ? (
            <>
              {/* Single-day: Datum | Čas od – do | Celý den */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Datum</label>
                  <input type="date" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required min={new Date().toISOString().slice(0, 10)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas</label>
                  {form.allDay ? (
                    <div className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text-muted text-sm">Celý den</div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input type="time" value={form.time}
                        onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputClass} />
                      <span className="text-text-muted text-sm">–</span>
                      <input type="time" value={form.time_to}
                        onChange={(e) => setForm({ ...form, time_to: e.target.value })} className={inputClass} />
                    </div>
                  )}
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.allDay}
                      onChange={(e) => setForm({ ...form, allDay: e.target.checked, time: "", time_to: "" })} className="w-3.5 h-3.5" />
                    <span className="text-xs text-text-muted">Celý den</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Multi-day: Datum od + Čas od | Datum do + Čas do | Celé dny */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Datum od</label>
                  <input type="date" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required min={new Date().toISOString().slice(0, 10)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas od</label>
                  {form.allDay ? (
                    <div className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text-muted text-sm">—</div>
                  ) : (
                    <input type="time" value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputClass} />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Datum do</label>
                  <input type="date" value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    required min={form.date} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas do</label>
                  {form.allDay ? (
                    <div className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text-muted text-sm">—</div>
                  ) : (
                    <input type="time" value={form.time_to}
                      onChange={(e) => setForm({ ...form, time_to: e.target.value })} className={inputClass} />
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.allDay}
                  onChange={(e) => setForm({ ...form, allDay: e.target.checked, time: "", time_to: "" })} className="w-3.5 h-3.5" />
                <span className="text-xs text-text-muted">Celé dny</span>
              </label>
            </>
          )}

          {/* Date conflict warning */}
          {dateConflicts.length > 0 && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-text">
                <p className="font-semibold">Tento termín je již obsazen:</p>
                <ul className="mt-1 list-disc list-inside text-text-muted">
                  {dateConflicts.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
                <p className="mt-1 text-text-muted">Žádost můžete přesto odeslat, ale termín nemusí být schválen.</p>
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Místo</label>
            <label className="flex items-center gap-2 cursor-pointer mb-1.5">
              <input
                type="checkbox"
                checked={form.locationAll}
                onChange={(e) =>
                  setForm({ ...form, locationAll: e.target.checked, locations: [] })
                }
                className="w-4 h-4 accent-brand-red"
              />
              <span className="text-sm text-text font-medium">Celý areál</span>
            </label>
            {!form.locationAll && (
              <div className="space-y-1 ml-1">
                {LOCATION_OPTIONS.map((l) => (
                  <label key={l.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.locations.includes(l.value)}
                      onChange={(e) => {
                        const locs = e.target.checked
                          ? [...form.locations, l.value]
                          : form.locations.filter((v) => v !== l.value);
                        setForm({ ...form, locations: locs });
                      }}
                      className="w-3.5 h-3.5 accent-brand-red"
                    />
                    <span className="text-sm text-text">{l.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Contact info */}
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
              Kontaktní údaje
              {!contactRequired && (
                <span className="font-normal normal-case tracking-normal ml-2">(volitelné)</span>
              )}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Jméno</label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  required={contactRequired}
                  maxLength={100}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Telefon</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  required={contactRequired}
                  placeholder="+420 xxx xxx xxx"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Email</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  required={contactRequired}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Description — only for "volne" + veřejná */}
          {form.event_type === "volne" && form.is_public && (
            <div>
              <label className="block text-sm font-semibold text-text mb-1">
                Popis akce <span className="font-normal text-text-muted">(zobrazí se v kalendáři akcí)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                maxLength={500}
                placeholder="Popis akce pro veřejnost..."
                className={inputClass}
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-text mb-1">
              Poznámka <span className="font-normal text-text-muted">
                ({form.event_type === "pronajem" ? "volitelné, pro administrátora" : "volitelné"})
              </span>
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder="Další informace k žádosti..."
              className={inputClass}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-red hover:bg-brand-red-dark text-white px-6 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
            {submitting ? "Odesílám..." : "Odeslat žádost"}
          </button>
        </form>
      )}
    </AnimatedSection>
  );
}
