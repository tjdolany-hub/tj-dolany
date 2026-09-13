"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { getSeasonList, getSeasonForDate, getSeasonHalf } from "@/lib/utils";

const SEASONS = getSeasonList();
const HALVES = [["podzim", "Podzim"], ["jaro", "Jaro"]] as const;
const OPTIONS = SEASONS.flatMap((s) => HALVES.map(([h, label]) => ({ key: `${s}|${h}`, label: `${label} ${s}` })));

/** Multi-select season+half filter ("2026/2027|podzim" keys), remembered in localStorage. */
export function useSeasonHalfFilter(storageKey: string) {
  const [filters, setFilters] = useState<string[]>(() => [`${getSeasonForDate(new Date())}|${getSeasonHalf(new Date())}`]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(stored) && stored.length > 0 && stored.every((f) => typeof f === "string")) setFilters(stored);
    } catch { /* ignore */ }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [filters, ready, storageKey]);

  // Sorted, comma-joined seasons — stable string usable as a fetch dependency
  const seasonsKey = [...new Set(filters.map((f) => f.split("|")[0]))].sort().join(",");

  const includes = (date: string, season?: string | null) =>
    filters.includes(`${getSeasonForDate(new Date(date), season)}|${getSeasonHalf(new Date(date))}`);

  return { filters, setFilters, ready, seasons: seasonsKey ? seasonsKey.split(",") : [], seasonsKey, includes };
}

export function SeasonHalfFilter({ filters, onChange }: { filters: string[]; onChange: (filters: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (key: string) => onChange(filters.includes(key) ? filters.filter((f) => f !== key) : [...filters, key]);

  const label = filters.length === 0
    ? "Vyberte období"
    : OPTIONS.filter((o) => filters.includes(o.key)).map((o) => o.label).join(", ");

  return (
    <div ref={ref} className="relative min-w-0 flex-1 max-w-md">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text hover:bg-surface-muted transition-colors">
        <span className="truncate">{label}</span>
        <ChevronDown size={16} className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg py-1">
          {SEASONS.map((s) => (
            <div key={s} className="px-2 py-1">
              <p className="px-2 pt-1 text-xs font-semibold text-text-muted">{s}</p>
              {HALVES.map(([h, halfLabel]) => {
                const key = `${s}|${h}`;
                return (
                  <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text cursor-pointer hover:bg-surface-muted">
                    <input type="checkbox" checked={filters.includes(key)} onChange={() => toggle(key)} className="accent-brand-red" />
                    {halfLabel} {s}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
