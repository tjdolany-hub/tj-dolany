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
    // Next 5 upcoming TJ events only (akce + zapas, not volne/pronajem)
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type, location, organizer")
      .in("event_type", ["akce", "zapas"])
      .eq("is_public", true)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(5),
    // All public events for calendar (all types including pronajem for admin visibility)
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type, location, organizer, is_public")
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
