import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import TymClient from "./TymClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tým",
  description: "Kádr mužstva TJ Dolany a aktuální losy soutěže.",
  openGraph: {
    title: "Tým | TJ Dolany",
    description: "Kádr mužstva TJ Dolany a aktuální losy soutěže.",
  },
};

export default async function TymPage() {
  const supabase = await createClient();

  const [{ data: players }, { data: draws }, { data: matches }] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("season_draws")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("match_results")
      .select("*")
      .order("date", { ascending: false })
      .limit(20),
  ]);

  return (
    <TymClient
      players={players ?? []}
      draws={draws ?? []}
      matches={matches ?? []}
    />
  );
}
