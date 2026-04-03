import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const type = body.type as string;

  const admin = await createServiceClient();
  let title: string | null = null;

  if (type === "article") {
    const { data } = await admin.from("articles").update({ deleted_at: null }).eq("id", id).select("title").single();
    title = data?.title ?? null;
  } else if (type === "match") {
    const { data } = await admin.from("match_results").update({ deleted_at: null }).eq("id", id).select("opponent, is_home").single();
    title = data ? `${data.is_home ? "TJ Dolany" : data.opponent} vs ${data.is_home ? data.opponent : "TJ Dolany"}` : null;
  } else if (type === "calendar_event") {
    const { data } = await admin.from("calendar_events").update({ deleted_at: null }).eq("id", id).select("title").single();
    title = data?.title ?? null;
  } else {
    return NextResponse.json({ error: "Neplatný typ" }, { status: 400 });
  }

  const entityType = type === "calendar_event" ? "calendar_event" : type === "match" ? "match" : "article";
  await logAudit(admin, { userId: user.id, userEmail: user.email ?? "", action: "restore", entityType, entityId: id, entityTitle: title });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const admin = await createServiceClient();

  if (type === "article") {
    await admin.from("article_images").delete().eq("article_id", id);
    await admin.from("articles").delete().eq("id", id);
  } else if (type === "match") {
    await admin.from("match_lineups").delete().eq("match_id", id);
    await admin.from("match_scorers").delete().eq("match_id", id);
    await admin.from("match_cards").delete().eq("match_id", id);
    await admin.from("match_images").delete().eq("match_id", id);
    await admin.from("match_results").delete().eq("id", id);
  } else if (type === "calendar_event") {
    await admin.from("calendar_events").delete().eq("id", id);
  } else {
    return NextResponse.json({ error: "Neplatný typ" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
