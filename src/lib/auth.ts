import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Role = "admin" | "editor";

export interface SessionProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface SessionContext {
  user: User;
  profile: SessionProfile;
  supabase: SupabaseClient<Database>;
  admin: SupabaseClient<Database>;
}

/**
 * Load the current session and profile. Returns a NextResponse if the caller
 * is not authenticated or has no profile row (should never happen, but we
 * fail closed).
 */
export async function getSession(): Promise<
  | { error: NextResponse; ctx?: undefined }
  | { error?: undefined; ctx: SessionContext }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Nepřihlášen" }, { status: 401 }),
    };
  }

  const admin = await createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      error: NextResponse.json(
        { error: "Profil nenalezen" },
        { status: 403 },
      ),
    };
  }

  return {
    ctx: {
      user,
      profile: profile as SessionProfile,
      supabase,
      admin,
    },
  };
}

/**
 * Require an authenticated admin. Returns a NextResponse to early-return
 * from the API route if the caller is not authorized.
 */
export async function requireAdmin(): Promise<
  | { error: NextResponse; ctx?: undefined }
  | { error?: undefined; ctx: SessionContext }
> {
  const result = await getSession();
  if (result.error) return result;

  if (result.ctx.profile.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Nedostatečná oprávnění" },
        { status: 403 },
      ),
    };
  }

  return result;
}
