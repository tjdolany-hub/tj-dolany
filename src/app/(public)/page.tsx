import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: articles }, { data: events }] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, slug, summary, category, created_at, updated_at, article_images(url, alt)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("future_events")
      .select("id, title, description, date, poster")
      .eq("published", true)
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(3),
  ]);

  return (
    <div>
      {/* Hero section placeholder - will be built with chosen design */}
      <section className="relative bg-brand-dark overflow-hidden min-h-[60vh] flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-5xl font-extrabold tracking-tight">
            Tělovýchovná jednota{" "}
            <span className="gradient-text">Dolany</span>
          </h1>
          <p className="mt-4 text-gray-300 text-lg">
            Fotbal, sokolovna a komunitní akce
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-red via-brand-yellow to-brand-red" />
      </section>

      {/* Content placeholder */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-text-muted">
          {articles?.length ?? 0} článků | {events?.length ?? 0} nadcházejících
          akcí
        </p>
        <p className="text-text-muted mt-2 text-sm">
          Design bude vybrán a implementován v dalším kroku.
        </p>
      </section>
    </div>
  );
}
