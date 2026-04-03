import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface TrashItem {
  id: string;
  title: string;
  type: "article" | "match" | "calendar_event";
  deleted_at: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const admin = await createServiceClient();

  const [articles, matches, events] = await Promise.all([
    admin
      .from("articles")
      .select("id, title, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    admin
      .from("match_results")
      .select("id, opponent, is_home, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    admin
      .from("calendar_events")
      .select("id, title, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);

  const items: TrashItem[] = [
    ...(articles.data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      type: "article" as const,
      deleted_at: a.deleted_at!,
    })),
    ...(matches.data ?? []).map((m) => ({
      id: m.id,
      title: `${m.is_home ? "TJ Dolany" : m.opponent} vs ${m.is_home ? m.opponent : "TJ Dolany"}`,
      type: "match" as const,
      deleted_at: m.deleted_at!,
    })),
    ...(events.data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      type: "calendar_event" as const,
      deleted_at: e.deleted_at!,
    })),
  ];

  items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

  return NextResponse.json(items);
}
