"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { LOCATION_LABELS } from "@/lib/utils";

interface RentalRequest {
  id: string;
  event_name: string | null;
  event_type: "pronajem" | "volne";
  organizer: string | null;
  is_public: boolean;
  location: string;
  date: string;
  time: string | null;
  all_day: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  note: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  calendar_event_id: string | null;
  created_at: string;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_LABELS: Record<string, string> = {
  pending: "Čekající",
  approved: "Schválená",
  rejected: "Zamítnutá",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function formatLocation(loc: string): string {
  if (loc === "cely_areal") return "Celý areál";
  return loc
    .split(",")
    .map((v) => LOCATION_LABELS[v.trim()] || v.trim())
    .join(", ");
}

export default function RentalRequestsTab({
  onPendingCountChange,
}: {
  onPendingCountChange?: (count: number) => void;
}) {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadRequests = useCallback(() => {
    setLoading(true);
    fetch("/api/rental-requests")
      .then((r) => r.json())
      .then((data: RentalRequest[]) => {
        setRequests(data);
        const pendingCount = data.filter((r) => r.status === "pending").length;
        onPendingCountChange?.(pendingCount);
      })
      .finally(() => setLoading(false));
  }, [onPendingCountChange]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id);
    const res = await fetch(`/api/rental-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_note: actionNote || null }),
    });
    if (res.ok) {
      setActionNote("");
      setExpandedId(null);
      loadRequests();
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Opravdu smazat tuto žádost?")) return;
    await fetch(`/api/rental-requests/${id}`, { method: "DELETE" });
    loadRequests();
  };

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            { value: "all", label: "Vše" },
            { value: "pending", label: "Čekající" },
            { value: "approved", label: "Schválené" },
            { value: "rejected", label: "Zamítnuté" },
          ] as { value: StatusFilter; label: string }[]
        ).map((f) => {
          const count =
            f.value === "all"
              ? requests.length
              : requests.filter((r) => r.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-brand-yellow text-brand-dark"
                  : "bg-surface border border-border text-text-muted"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className="ml-1.5 bg-black/10 px-1.5 py-0.5 rounded text-[10px]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-text-muted">Načítám...</p>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="text-left p-3 font-semibold text-text">Datum žádosti</th>
                <th className="text-left p-3 font-semibold text-text">Typ</th>
                <th className="text-left p-3 font-semibold text-text">Datum akce</th>
                <th className="text-left p-3 font-semibold text-text hidden md:table-cell">
                  Místo
                </th>
                <th className="text-left p-3 font-semibold text-text hidden lg:table-cell">
                  Kontakt
                </th>
                <th className="text-left p-3 font-semibold text-text">Stav</th>
                <th className="text-right p-3 font-semibold text-text">Akce</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const createdDate = new Date(r.created_at).toLocaleDateString("cs-CZ");
                const eventDate = new Date(r.date).toLocaleDateString("cs-CZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const timeStr = r.all_day
                  ? "Celý den"
                  : r.time || "—";
                const title =
                  r.event_type === "pronajem"
                    ? "Soukromá akce"
                    : r.event_name || "—";
                const isExpanded = expandedId === r.id;

                return (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-3 text-text-muted whitespace-nowrap">{createdDate}</td>
                    <td className="p-3">
                      <div className="font-medium text-text">{title}</div>
                      {r.organizer && (
                        <div className="text-xs text-text-muted">{r.organizer}</div>
                      )}
                    </td>
                    <td className="p-3 text-text-muted whitespace-nowrap">
                      <div>{eventDate}</div>
                      <div className="text-xs">{timeStr}</div>
                    </td>
                    <td className="p-3 text-text-muted hidden md:table-cell">
                      {formatLocation(r.location)}
                    </td>
                    <td className="p-3 text-text-muted hidden lg:table-cell">
                      {(r.contact_name || r.contact_phone || r.contact_email) ? (
                        <div className="text-xs">
                          {r.contact_name && <div>{r.contact_name}</div>}
                          {r.contact_phone && <div>{r.contact_phone}</div>}
                          {r.contact_email && <div>{r.contact_email}</div>}
                        </div>
                      ) : (
                        <span className="text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${STATUS_BADGE[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {r.status === "pending" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : r.id)
                              }
                              className="text-text-muted hover:text-text p-1"
                              title="Rozbalit"
                            >
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleAction(r.id, "approved")}
                              disabled={actionLoading === r.id}
                              className="text-green-600 hover:text-green-800 p-1 disabled:opacity-50"
                              title="Schválit"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleAction(r.id, "rejected")}
                              disabled={actionLoading === r.id}
                              className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                              title="Zamítnout"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Smazat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-text-muted">
                    Žádné žádosti
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Expanded detail for pending request (admin note input) */}
          {expandedId && (
            <div className="border-t border-border bg-surface-alt p-4">
              {(() => {
                const r = requests.find((req) => req.id === expandedId);
                if (!r) return null;
                return (
                  <div className="space-y-3 max-w-2xl">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-text">Kontakt:</span>
                        <div className="text-text-muted mt-1">
                          {r.contact_name || "—"}
                          {r.contact_phone && <><br />{r.contact_phone}</>}
                          {r.contact_email && <><br />{r.contact_email}</>}
                        </div>
                      </div>
                      {r.note && (
                        <div>
                          <span className="font-semibold text-text">Poznámka:</span>
                          <p className="text-text-muted mt-1">{r.note}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text mb-1">
                        Vzkaz žadateli{" "}
                        <span className="font-normal text-text-muted">(volitelné)</span>
                      </label>
                      <textarea
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        rows={2}
                        placeholder="Poznámka k schválení/zamítnutí..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(expandedId, "approved")}
                        disabled={actionLoading === expandedId}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        <Check size={14} /> Schválit
                      </button>
                      <button
                        onClick={() => handleAction(expandedId, "rejected")}
                        disabled={actionLoading === expandedId}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        <X size={14} /> Zamítnout
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
