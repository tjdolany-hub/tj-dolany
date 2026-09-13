"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { getSeasonList, getSeasonForDate, getSeasonHalf } from "@/lib/utils";

const SEASONS = getSeasonList();
const HALVES = [{ value: "podzim", label: "Podzim" }, { value: "jaro", label: "Jaro" }];

export interface PeriodFilters {
  seasons: string[];
  halves: string[];
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** Season + half filter (both multi-select), remembered in localStorage. */
export function useSeasonHalfFilter(storageKey: string) {
  const [filters, setFilters] = useState<PeriodFilters>(() => ({
    seasons: [getSeasonForDate(new Date())],
    halves: [getSeasonHalf(new Date())],
  }));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (stored && typeof stored === "object" && isStringArray((stored as PeriodFilters).seasons) && isStringArray((stored as PeriodFilters).halves)) {
        setFilters(stored as PeriodFilters);
      }
    } catch { /* ignore */ }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [filters, ready, storageKey]);

  // Sorted, comma-joined seasons — stable string usable as a fetch dependency
  const seasonsKey = [...filters.seasons].sort().join(",");

  const includes = (date: string, season?: string | null) =>
    filters.seasons.includes(getSeasonForDate(new Date(date), season)) &&
    filters.halves.includes(getSeasonHalf(new Date(date)));

  return { filters, setFilters, ready, seasonsKey, includes };
}

function MultiSelect({ options, selected, onChange, placeholder, className }: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className: string;
}) {
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

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const label = selected.length === 0
    ? placeholder
    : selected.length === options.length && options.length > 2
      ? "Všechny sezóny"
      : options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(", ");

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text hover:bg-surface-muted transition-colors">
        <span className={`truncate ${selected.length === 0 ? "text-text-muted" : ""}`}>{label}</span>
        <ChevronDown size={16} className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg p-1">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text cursor-pointer hover:bg-surface-muted">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="accent-brand-red" />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function SeasonHalfFilter({ filters, onChange, seasons = SEASONS, className = "" }: {
  filters: PeriodFilters;
  onChange: (filters: PeriodFilters) => void;
  seasons?: string[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 min-w-0 ${className}`}>
      <MultiSelect
        options={seasons.map((s) => ({ value: s, label: s }))}
        selected={filters.seasons}
        onChange={(seasons) => onChange({ ...filters, seasons })}
        placeholder="Sezóna"
        className="w-48"
      />
      <MultiSelect
        options={HALVES}
        selected={filters.halves}
        onChange={(halves) => onChange({ ...filters, halves })}
        placeholder="Podzim / Jaro"
        className="w-40"
      />
    </div>
  );
}
