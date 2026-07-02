"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Save, X, CheckCircle } from "lucide-react";
import { LOCATION_LABELS, ORGANIZERS } from "@/lib/utils";

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

const DAY_NAMES = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

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

function formatLocation(loc: string | null): string {
  if (!loc) return "—";
  if (loc === "cely_areal") return "Celý areál";
  return loc.split(",").map((v) => LOCATION_LABELS[v.trim()] || v.trim()).join(", ");
}

export default function ScheduleTab() {
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleEditId, setScheduleEditId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState(DEFAULT_SCHEDULE_FORM);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

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
    setScheduleSaved(false);
  };

  const updateScheduleForm = (patch: Partial<typeof scheduleForm>) => {
    setScheduleSaved(false);
    setScheduleForm((prev) => ({ ...prev, ...patch }));
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
      if (scheduleEditId) { setScheduleSaved(true); } else { resetScheduleForm(); }
      loadSchedule();
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || `Chyba při ukládání (${res.status})`);
    }
    setScheduleSaving(false);
  };

  const deleteScheduleEntry = async (id: string) => {
    if (!confirm("Opravdu smazat?")) return;
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    loadSchedule();
  };

  return (
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
              <select value={scheduleForm.day_of_week} onChange={(e) => updateScheduleForm({ day_of_week: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text">
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Název</label>
              <input type="text" value={scheduleForm.title} onChange={(e) => updateScheduleForm({ title: e.target.value })} required
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Čas od</label>
              <input type="time" value={scheduleForm.time_from} onChange={(e) => updateScheduleForm({ time_from: e.target.value })} required
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Čas do</label>
              <input type="time" value={scheduleForm.time_to} onChange={(e) => updateScheduleForm({ time_to: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Místo</label>
              <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                <input type="checkbox" checked={scheduleForm.locationAll}
                  onChange={(e) => updateScheduleForm({ locationAll: e.target.checked, locations: [] })}
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
                          updateScheduleForm({ locations: locs });
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
                onChange={(e) => updateScheduleForm({ organizer: e.target.value, customOrganizer: "" })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text"
              >
                {ORGANIZERS.map((o) => <option key={o} value={o}>{o}</option>)}
                <option value="__custom__">Jiný...</option>
              </select>
              {scheduleForm.organizer === "__custom__" && (
                <input type="text" value={scheduleForm.customOrganizer} onChange={(e) => updateScheduleForm({ customOrganizer: e.target.value })}
                  placeholder="Jméno pořadatele" className="w-full px-3 py-2 mt-2 bg-surface border border-border rounded-lg text-text" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Platnost od</label>
              <input type="date" value={scheduleForm.valid_from} onChange={(e) => updateScheduleForm({ valid_from: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
              <p className="text-xs text-text-muted mt-1">Ponechte prázdné = platí odjakživa</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Platnost do</label>
              <input type="date" value={scheduleForm.valid_to} onChange={(e) => updateScheduleForm({ valid_to: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
              <p className="text-xs text-text-muted mt-1">Ponechte prázdné = platí navždy</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={scheduleSaving}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
              <Save size={16} /> {scheduleSaving ? "Ukládám..." : "Uložit"}
            </button>
            <button type="button" onClick={resetScheduleForm}
              className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
              <X size={16} /> Zrušit
            </button>
            {scheduleSaved && (
              <span className="flex items-center gap-1.5 text-green-500 text-sm font-semibold ml-2">
                <CheckCircle size={16} /> Uloženo
              </span>
            )}
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
  );
}
