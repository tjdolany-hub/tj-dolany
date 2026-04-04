export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
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
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
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
  return `${formatDateCzech(dateStr)} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
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
