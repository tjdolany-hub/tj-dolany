"use client";

import { useState, useEffect, useCallback } from "react";
import { History } from "lucide-react";

interface AuditEntry {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: "Vytvořil",
  update: "Upravil",
  delete: "Smazal",
  restore: "Obnovil",
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-green-500",
  update: "text-blue-500",
  delete: "text-red-500",
  restore: "text-yellow-500",
};

const ENTITY_LABELS: Record<string, string> = {
  article: "Článek",
  match: "Zápas",
  calendar_event: "Akce",
  player: "Hráč",
};

const FILTER_OPTIONS = [
  { value: "", label: "Vše" },
  { value: "article", label: "Články" },
  { value: "match", label: "Zápasy" },
  { value: "calendar_event", label: "Akce" },
  { value: "player", label: "Hráči" },
];

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const loadAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const filtered = filter ? entries.filter((e) => e.entity_type === filter) : entries;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History size={28} className="text-brand-red" />
          <h1 className="text-3xl font-bold text-text">Historie změn</h1>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        >
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
          <span className="ml-3 text-text-muted">Načítám...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <History size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-semibold">Žádné záznamy</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-3 font-semibold text-text">Datum</th>
                <th className="text-left px-4 py-3 font-semibold text-text">Uživatel</th>
                <th className="text-left px-4 py-3 font-semibold text-text">Akce</th>
                <th className="text-left px-4 py-3 font-semibold text-text">Typ</th>
                <th className="text-left px-4 py-3 font-semibold text-text">Název</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors">
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{e.user_email}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${ACTION_COLORS[e.action] ?? "text-text"}`}>
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text">{ENTITY_LABELS[e.entity_type] ?? e.entity_type}</td>
                  <td className="px-4 py-3 text-text truncate max-w-[300px]">{e.entity_title || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
