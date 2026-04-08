import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

// GET: list trainings with attendance, optionally filtered by season
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");

  let query = supabase
    .from("trainings")
    .select("*, training_attendance(player_id, response)")
    .order("date", { ascending: true });

  if (season) {
    query = query.eq("season", season);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST: import training data from parsed spreadsheet
const importSchema = z.object({
  trainings: z.array(z.object({
    date: z.string(),
    title: z.string(),
    type: z.enum(["trenink", "zapas"]).default("trenink"),
  })),
  attendance: z.array(z.object({
    playerName: z.string(),
    responses: z.array(z.object({
      trainingIndex: z.number(),
      response: z.enum(["jde", "nejde", "neodpovedel"]),
    })),
  })),
  season: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await createServiceClient();

  // Fetch all players for name matching
  const { data: players } = await admin
    .from("players")
    .select("id, name, first_name, last_name");

  if (!players) {
    return NextResponse.json({ error: "Nepodařilo se načíst hráče" }, { status: 500 });
  }

  // Match player names to DB players
  const unmatchedPlayers: string[] = [];
  const playerMap = new Map<string, string>(); // playerName -> player_id

  for (const att of parsed.data.attendance) {
    const matched = findPlayer(att.playerName, players);
    if (matched) {
      playerMap.set(att.playerName, matched.id);
    } else {
      unmatchedPlayers.push(att.playerName);
    }
  }

  // If there are unmatched players, return them as warnings (but continue)
  const warnings: string[] = unmatchedPlayers.map(
    (name) => `Hráč "${name}" nebyl nalezen v databázi`
  );

  // Insert trainings (upsert by date+title to avoid duplicates)
  const trainingIds: string[] = [];
  const duplicateTrainings: string[] = [];

  for (const t of parsed.data.trainings) {
    // Check if training already exists
    const { data: existing } = await admin
      .from("trainings")
      .select("id")
      .eq("date", t.date)
      .eq("title", t.title)
      .single();

    if (existing) {
      trainingIds.push(existing.id);
      duplicateTrainings.push(t.title);
    } else {
      const { data: inserted, error } = await admin
        .from("trainings")
        .insert({
          date: t.date,
          title: t.title,
          type: t.type,
          season: parsed.data.season || null,
        })
        .select("id")
        .single();

      if (error) {
        return NextResponse.json({ error: `Chyba při ukládání tréninku: ${error.message}` }, { status: 500 });
      }
      trainingIds.push(inserted.id);
    }
  }

  if (duplicateTrainings.length > 0) {
    warnings.push(
      `${duplicateTrainings.length} tréninků už existuje — data budou aktualizována`
    );
  }

  // Insert attendance records (upsert: update response if already exists)
  let importedCount = 0;
  let updatedCount = 0;

  for (const att of parsed.data.attendance) {
    const playerId = playerMap.get(att.playerName);
    if (!playerId) continue; // Skip unmatched players

    for (const resp of att.responses) {
      const trainingId = trainingIds[resp.trainingIndex];
      if (!trainingId) continue;

      // Check if attendance record exists
      const { data: existingAtt } = await admin
        .from("training_attendance")
        .select("id, response")
        .eq("training_id", trainingId)
        .eq("player_id", playerId)
        .single();

      if (existingAtt) {
        if (existingAtt.response !== resp.response) {
          await admin
            .from("training_attendance")
            .update({ response: resp.response })
            .eq("id", existingAtt.id);
          updatedCount++;
        }
      } else {
        await admin
          .from("training_attendance")
          .insert({
            training_id: trainingId,
            player_id: playerId,
            response: resp.response,
          });
        importedCount++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    imported: importedCount,
    updated: updatedCount,
    trainings: trainingIds.length,
    warnings,
  });
}

// DELETE: remove a training and all its attendance records
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Chybí ID" }, { status: 400 });
  }

  const admin = await createServiceClient();
  // Cascade delete handles training_attendance
  const { error } = await admin.from("trainings").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Player name matching logic (similar to match-parser)
function findPlayer(
  name: string,
  players: { id: string; name: string; first_name: string | null; last_name: string | null }[]
): { id: string; name: string } | undefined {
  const nameLower = name.trim().toLowerCase();

  // 1. Exact match on full name
  let match = players.find((p) => p.name.toLowerCase() === nameLower);
  if (match) return match;

  // 2. Match on first_name + last_name
  match = players.find((p) => {
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase();
    return fullName === nameLower;
  });
  if (match) return match;

  // 3. Reversed name match (e.g., "Karel Jaroslav" vs "Jaroslav Karel")
  const parts = nameLower.split(/\s+/);
  if (parts.length >= 2) {
    const reversed = [...parts].reverse().join(" ");
    match = players.find((p) => p.name.toLowerCase() === reversed);
    if (match) return match;
  }

  // 4. Surname-only match (if unambiguous)
  if (parts.length >= 1) {
    const surname = parts[parts.length - 1];
    const surnameMatches = players.filter((p) => {
      const pParts = p.name.toLowerCase().split(/\s+/);
      return pParts.some((pp) => pp === surname);
    });
    if (surnameMatches.length === 1) return surnameMatches[0];
  }

  // 5. Try first name match (if unambiguous)
  if (parts.length >= 1) {
    const firstName = parts[0];
    const firstNameMatches = players.filter((p) => {
      const pParts = p.name.toLowerCase().split(/\s+/);
      return pParts[0] === firstName;
    });
    if (firstNameMatches.length === 1) return firstNameMatches[0];
  }

  return undefined;
}
