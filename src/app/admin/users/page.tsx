"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrátor",
  editor: "Editor",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-brand-red/10 text-brand-red",
  editor: "bg-blue-500/10 text-blue-500",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield size={28} className="text-brand-red" />
        <h1 className="text-3xl font-bold text-text">Uživatelé</h1>
        <span className="text-sm text-text-muted">({users.length})</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
          <span className="ml-3 text-text-muted">Načítám...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Shield size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-semibold">Žádní uživatelé</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-3 font-semibold text-text">Jméno</th>
                <th className="text-left px-4 py-3 font-semibold text-text">E-mail</th>
                <th className="text-left px-4 py-3 font-semibold text-text">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-text">Vytvořen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors">
                  <td className="px-4 py-3 text-text font-medium">{u.name || "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role] ?? "bg-gray-500/10 text-gray-500"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(u.created_at).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
