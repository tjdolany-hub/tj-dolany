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
