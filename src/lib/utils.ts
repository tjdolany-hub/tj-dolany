export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Timezone-safe helpers (Europe/Prague) ──
// These use Intl.DateTimeFormat so they return correct Prague time
// on both Vercel server (UTC) and in browser (local time).

const PRAGUE_TZ = "Europe/Prague";

/** Get hour in Europe/Prague timezone */
export function getHoursPrague(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: PRAGUE_TZ }).format(date),
    10,
  );
}

/** Get minutes in Europe/Prague timezone */
export function getMinutesPrague(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", { minute: "numeric", timeZone: PRAGUE_TZ }).format(date),
    10,
  );
}

/** Format time as "HH:MM" in Europe/Prague timezone */
export function formatTimePrague(date: Date): string {
  const h = getHoursPrague(date);
  const m = getMinutesPrague(date);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Check if a date is midnight (00:00) in Prague timezone — used for all-day detection */
export function isMidnightPrague(date: Date): boolean {
  return getHoursPrague(date) === 0 && getMinutesPrague(date) === 0;
}

/** Get day of month in Europe/Prague timezone */
export function getDayPrague(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: PRAGUE_TZ }).format(date),
    10,
  );
}

/** Get month (0-based) in Europe/Prague timezone */
export function getMonthPrague(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: PRAGUE_TZ }).format(date),
    10,
  ) - 1;
}

/** Get full year in Europe/Prague timezone */
export function getYearPrague(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: PRAGUE_TZ }).format(date),
    10,
  );
}

/**
 * Convert a date + time (both in Prague local time) to an ISO string with
 * the correct Europe/Prague UTC offset. Uses Intl to determine CET (+01:00)
 * or CEST (+02:00) — never relies on the browser/server timezone.
 *
 * @param dateStr "2026-04-12"
 * @param timeStr "16:00"
 * @returns "2026-04-12T16:00:00+02:00"
 */
export function toPragueISO(dateStr: string, timeStr: string): string {
  const ref = new Date(`${dateStr}T12:00:00Z`);
  const pragueHour = parseInt(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: PRAGUE_TZ }).format(ref),
    10,
  );
  const offsetHours = pragueHour - 12;
  const sign = offsetHours >= 0 ? "+" : "-";
  const abs = Math.abs(offsetHours);
  return `${dateStr}T${timeStr}:00${sign}${abs.toString().padStart(2, "0")}:00`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatDateCzech(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: PRAGUE_TZ,
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: PRAGUE_TZ,
  });
}

export const CATEGORIES = [
  { value: "aktuality", label: "Aktuality" },
  { value: "fotbal", label: "Fotbal" },
  { value: "sokolovna", label: "Sokolovna" },
  { value: "oznameni", label: "Oznámení" },
] as const;

export const POSITIONS = [
  { value: "brankar", label: "Brankář" },
  { value: "obrance", label: "Obránce" },
  { value: "zaloznik", label: "Záložník" },
  { value: "utocnik", label: "Útočník" },
  { value: "trener", label: "Trenér" },
] as const;

export const EVENT_TYPES = [
  { value: "zapas", label: "Zápas" },
  { value: "trenink", label: "Trénink" },
  { value: "akce", label: "Akce" },
  { value: "pronajem", label: "Pronájem" },
  { value: "volne", label: "Volné" },
] as const;

export function getSupabasePublicUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}

export function formatDateTimeCzech(dateStr: string): string {
  const d = new Date(dateStr);
  return `${formatDateCzech(dateStr)} ${formatTimePrague(d)}`;
}

export const POSITION_LABELS: Record<string, string> = {
  brankar: "Brankář",
  obrance: "Obránce",
  zaloznik: "Záložník",
  utocnik: "Útočník",
  trener: "Trenér",
};

export const POSITION_COLORS: Record<string, string> = {
  brankar: "bg-yellow-500 text-black",
  obrance: "bg-blue-500 text-white",
  zaloznik: "bg-green-500 text-white",
  utocnik: "bg-red-500 text-white",
  trener: "bg-gray-600 text-white",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  zapas: "bg-red-500",
  trenink: "bg-yellow-500",
  akce: "bg-green-500",
  pronajem: "bg-blue-500",
  volne: "bg-cyan-500",
};

export const LOCATIONS = [
  { value: "cely_areal", label: "Celý areál" },
  { value: "sokolovna", label: "Sokolovna" },
  { value: "kantyna", label: "Kantýna" },
  { value: "venkovni_cast", label: "Venkovní část" },
  { value: "hriste", label: "Hřiště" },
] as const;

export const LOCATION_LABELS: Record<string, string> = {
  cely_areal: "Celý areál",
  sokolovna: "Sokolovna",
  kantyna: "Kantýna",
  venkovni_cast: "Venkovní část",
  hriste: "Hřiště",
};

export const ORGANIZERS = [
  "TJ Dolany",
  "Obec Dolany",
  "DS Dolany",
  "SDH Dolany",
] as const;
