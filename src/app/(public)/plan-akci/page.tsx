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

  const [{ data: upcoming }, { data: allEvents }, { data: schedule }] = await Promise.all([
    // Next 5 public events (akce + volne, no pronajem)
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type, location, organizer")
      .in("event_type", ["akce", "volne"])
      .eq("is_public", true)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(5),
    // All public events for calendar (akce + volne + zapas, no pronajem)
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type, location, organizer")
      .in("event_type", ["akce", "volne", "zapas", "trenink"])
      .eq("is_public", true)
      .order("date", { ascending: true }),
    // Weekly schedule
    supabase
      .from("weekly_schedule")
      .select("*")
      .order("day_of_week", { ascending: true }),
  ]);

  return (
    <PlanAkciClient
      upcoming={upcoming ?? []}
      allEvents={allEvents ?? []}
      schedule={schedule ?? []}
    />
  );
}
