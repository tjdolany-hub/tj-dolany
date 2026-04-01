import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import PlanAkciClient from "./PlanAkciClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Plán akcí",
  description: "Kalendář akcí a plánované události TJ Dolany.",
  openGraph: {
    title: "Plán akcí | TJ Dolany",
    description: "Kalendář akcí a plánované události TJ Dolany.",
  },
};

export default async function PlanAkciPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("future_events")
      .select("*")
      .eq("published", true)
      .gte("date", now)
      .order("date", { ascending: true }),
    supabase
      .from("future_events")
      .select("*")
      .eq("published", true)
      .lt("date", now)
      .order("date", { ascending: false })
      .limit(6),
  ]);

  return <PlanAkciClient upcoming={upcoming ?? []} past={past ?? []} />;
}
