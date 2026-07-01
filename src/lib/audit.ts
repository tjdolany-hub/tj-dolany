import { SupabaseClient } from "@supabase/supabase-js";

type AuditAction = "create" | "update" | "delete" | "restore" | "reset_password";
type EntityType =
  | "article"
  | "match"
  | "calendar_event"
  | "player"
  | "user"
  | "team"
  | "draw"
  | "standing"
  | "schedule"
  | "training";

interface AuditEntry {
  userId: string;
  userEmail: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityTitle?: string | null;
}

export async function logAudit(
  supabase: SupabaseClient,
  entry: AuditEntry,
) {
  // supabase-js returns { error } instead of throwing, so check it explicitly.
  // Audit logging must never break the main operation — only log the cause.
  const { error } = await supabase.from("audit_log").insert({
    user_id: entry.userId,
    user_email: entry.userEmail,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    entity_title: entry.entityTitle || null,
  });
  if (error) {
    console.error("Failed to write audit log:", error.message);
  }
}
