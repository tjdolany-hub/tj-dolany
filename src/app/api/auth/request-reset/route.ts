import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email";

// ── Rate limiting (in-memory, resets on cold start) ──
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW,
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return false;
}

const schema = z.object({
  email: z.string().email("Neplatný e-mail").max(254),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Příliš mnoho žádostí. Zkuste to později." },
      { status: 429 },
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  // Always return success regardless of whether the email exists, to avoid
  // leaking which emails are registered. Only log and send when the address
  // matches a known profile.
  const admin = await createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("email", parsed.data.email)
    .single();

  if (profile) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tjdolany.net";
    const { data: link } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    if (link?.properties?.action_link) {
      try {
        await sendPasswordResetEmail(profile.email, link.properties.action_link);
      } catch (e) {
        console.error("Failed to send reset email", e);
      }
    }
  }

  return NextResponse.json({ success: true });
}
