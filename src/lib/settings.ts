import type { SupabaseClient } from "@supabase/supabase-js";
import { getSeasonForDate } from "@/lib/utils";

/**
 * The "current season" shown on public pages (homepage stats, squad page).
 * Prefers the admin-set `app_settings.active_season`; falls back to the
 * date-based season (August boundary) when it hasn't been set.
 */
export async function getActiveSeason(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("active_season")
    .eq("id", 1)
    .maybeSingle();
  return data?.active_season || getSeasonForDate(new Date());
}
