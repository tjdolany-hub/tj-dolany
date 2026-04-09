import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: articlesCount },
    { count: playersCount },
    { count: eventsCount },
  ] = await Promise.all([
    supabase.from("articles").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("future_events").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Články", count: articlesCount ?? 0 },
    { label: "Hráči", count: playersCount ?? 0 },
    { label: "Akce", count: eventsCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <p className="text-3xl font-bold text-brand-red">{s.count}</p>
            <p className="text-sm text-text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
