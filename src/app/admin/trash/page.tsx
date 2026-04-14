"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { useIsAdmin } from "@/components/admin/AdminRoleContext";

interface TrashItem {
  id: string;
  title: string;
  type: "article" | "match" | "calendar_event";
  deleted_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  article: "Článek",
  match: "Zápas",
  calendar_event: "Akce",
};

const TYPE_COLORS: Record<string, string> = {
  article: "bg-blue-500/10 text-blue-500",
  match: "bg-green-500/10 text-green-500",
  calendar_event: "bg-purple-500/10 text-purple-500",
};

function daysUntilPurge(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const now = Date.now();
  const daysPassed = Math.floor((now - deleted) / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - daysPassed);
}

export default function AdminTrashPage() {
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    try {
      const res = await fetch("/api/trash");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const restoreItem = async (item: TrashItem) => {
    setActionId(item.id);
    try {
      await fetch(`/api/trash/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type }),
      });
      await loadTrash();
    } finally {
      setActionId(null);
    }
  };

  const permanentDelete = async (item: TrashItem) => {
    if (!confirm(`Opravdu trvale smazat "${item.title}"? Tuto akci nelze vrátit.`)) return;
    setActionId(item.id);
    try {
      await fetch(`/api/trash/${item.id}?type=${item.type}`, { method: "DELETE" });
      await loadTrash();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Trash2 size={28} className="text-brand-red" />
        <h1 className="text-3xl font-bold text-text">Koš</h1>
        <span className="text-sm text-text-muted">({items.length} položek)</span>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 mb-6 flex items-center gap-3 text-sm text-yellow-600">
        <AlertTriangle size={18} />
        <span>Smazané položky budou trvale odstraněny po 30 dnech.</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
          <span className="ml-3 text-text-muted">Načítám...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Trash2 size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-semibold">Koš je prázdný</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const days = daysUntilPurge(item.deleted_at);
            const isProcessing = actionId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-surface rounded-xl border border-border p-4 flex items-center gap-4 ${isProcessing ? "opacity-30 pointer-events-none" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text truncate">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span className={`inline-block font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type] ?? ""}`}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    <span>
                      Smazáno {new Date(item.deleted_at).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })}
                    </span>
                    <span className={days <= 7 ? "text-red-500 font-semibold" : ""}>
                      {days > 0 ? `${days} dní do smazání` : "K trvalému smazání"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => restoreItem(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                  >
                    <RotateCcw size={14} /> Obnovit
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => permanentDelete(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={14} /> Smazat trvale
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
