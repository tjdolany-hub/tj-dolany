import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import PlanAkciClient from "./PlanAkciClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Plán akcí a zápasů",
  description: "Kalendář akcí, zápasů a plánované události TJ Dolany.",
  openGraph: {
    title: "Plán akcí a zápasů | TJ Dolany",
    description: "Kalendář akcí, zápasů a plánované události TJ Dolany.",
  },
};

export default async function PlanAkciPage() {
  const supabase = await createClient();
  // Service client bypasses RLS — calendar must show ALL events (including private rentals)
  const serviceClient = await createServiceClient();
  const now = new Date().toISOString();

  const [{ data: upcoming }, { data: allEvents }, { data: schedule }] = await Promise.all([
    // Next 5 upcoming TJ events only (akce + zapas, not volne/pronajem)
    supabase
      .from("calendar_events")
      .select("id, title, description, date, event_type, location, organizer")
      .in("event_type", ["akce", "zapas"])
      .eq("is_public", true)
      .is("deleted_at", null)
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(5),
    // All events for calendar — uses service client to bypass RLS
    // (is_public means "open to public attendance", not "visible in calendar")
    serviceClient
      .from("calendar_events")
      .select("id, title, description, date, end_date, all_day, event_type, location, organizer, is_public")
      .is("deleted_at", null)
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
