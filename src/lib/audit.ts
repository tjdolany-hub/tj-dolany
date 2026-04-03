import { SupabaseClient } from "@supabase/supabase-js";

type AuditAction = "create" | "update" | "delete" | "restore";
type EntityType = "article" | "match" | "calendar_event" | "player";

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
  try {
    await supabase.from("audit_log").insert({
      user_id: entry.userId,
      user_email: entry.userEmail,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      entity_title: entry.entityTitle || null,
    });
  } catch {
    // Audit logging should never break the main operation
    console.error("Failed to write audit log");
  }
}
