import { NextRequest, NextResponse } from "next/server";
import { revalidatePublicPages } from "@/lib/revalidate";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const teamSchema = z.object({
  name: z.string().min(1, "Název týmu je povinný"),
  keywords: z.array(z.string()).default([]),
  logo_url: z.string().nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  return NextResponse.json(teams ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = teamSchema.safeParse(body);
  if (!parsed.success) {
    revalidatePublicPages();
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const admin = await createServiceClient();
  const { data: team, error } = await admin
    .from("teams")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePublicPages();
  return NextResponse.json(team, { status: 201 });
}
