"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  UserPlus,
  KeyRound,
  Trash2,
  X,
  RefreshCw,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useAdminSession } from "@/components/admin/AdminRoleContext";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "editor";
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

function generatePassword(length = 12) {
  // Exclude ambiguous chars (0/O, 1/l/I)
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const specials = "!@#$%&*";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length - 1; i++) {
    out += chars[bytes[i] % chars.length];
  }
  out += specials[bytes[length - 1] % specials.length];
  return out;
}

export default function AdminUsersPage() {
  const { role: currentRole, userId: currentUserId } = useAdminSession();
  const isAdmin = currentRole === "admin";

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);

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

  function flash(kind: "success" | "error", text: string) {
    setBanner({ kind, text });
    setTimeout(() => setBanner(null), 4500);
  }

  async function changeRole(id: string, role: "admin" | "editor") {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      flash("error", data.error || "Nepodařilo se změnit roli");
      return;
    }
    await loadUsers();
    flash("success", "Role změněna");
  }

  async function deleteUser(user: Profile) {
    if (!confirm(`Opravdu smazat uživatele ${user.email}? Tuto akci nelze vrátit.`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      flash("error", data.error || "Nepodařilo se smazat uživatele");
      return;
    }
    await loadUsers();
    flash("success", "Uživatel smazán");
  }

  async function resetPassword(user: Profile) {
    if (!confirm(`Odeslat odkaz pro obnovu hesla na ${user.email}?`)) return;
    const res = await fetch(`/api/users/${user.id}/reset-password`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      flash("error", data.error || "Nepodařilo se odeslat e-mail");
      return;
    }
    flash("success", `Odkaz odeslán na ${user.email}`);
  }

  if (!isAdmin) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Shield size={28} className="text-brand-red" />
          <h1 className="text-3xl font-bold text-text">Uživatelé</h1>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={18} />
          Tato sekce je dostupná pouze administrátorům.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield size={28} className="text-brand-red" />
        <h1 className="text-3xl font-bold text-text">Uživatelé</h1>
        <span className="text-sm text-text-muted">({users.length})</span>
        <div className="ml-auto">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand-red hover:bg-brand-red-dark text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus size={18} /> Nový uživatel
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            banner.kind === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-300"
              : "bg-brand-red/10 border border-brand-red/30 text-brand-red"
          }`}
        >
          {banner.text}
        </div>
      )}

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
                <th className="text-right px-4 py-3 font-semibold text-text">Akce</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3 text-text font-medium">
                      {u.name || "—"}
                      {isSelf && <span className="ml-2 text-xs text-text-muted">(Vy)</span>}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as "admin" | "editor")}
                        disabled={isSelf}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border-0 appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${ROLE_COLORS[u.role] ?? "bg-gray-500/10 text-gray-500"}`}
                        title={isSelf ? "Nemůžete změnit vlastní roli" : "Změnit roli"}
                      >
                        <option value="admin">Administrátor</option>
                        <option value="editor">Editor</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(u.created_at).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => resetPassword(u)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                          title="Odeslat odkaz pro obnovu hesla"
                        >
                          <KeyRound size={14} /> Reset hesla
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => deleteUser(u)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                            title="Smazat uživatele"
                          >
                            <Trash2 size={14} /> Smazat
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await loadUsers();
            flash("success", "Uživatel vytvořen");
          }}
          onError={(text) => flash("error", text)}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (text: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [password, setPassword] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setPassword(generatePassword(14));
    setShowPassword(true);
    setCopied(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      onError("Heslo musí mít alespoň 8 znaků");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role, password, sendEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.error || `Chyba (${res.status})`);
        return;
      }
      if (data.warning) onError(data.warning);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface rounded-xl border border-border w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <UserPlus size={20} className="text-brand-red" />
            Nový uživatel
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Jméno</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              placeholder="Jan Novák"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              placeholder="uzivatel@email.cz"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "editor")}
              className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              <option value="editor">Editor — spravuje obsah</option>
              <option value="admin">Administrátor — plná práva</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">Počáteční heslo</label>
            <div className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="flex-1 px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-red"
                placeholder="Alespoň 8 znaků"
              />
              <button
                type="button"
                onClick={handleGenerate}
                className="flex items-center gap-1 px-3 py-2 bg-surface-muted hover:bg-surface border border-border rounded-lg text-text-muted hover:text-text text-sm transition-colors"
                title="Vygenerovat náhodné heslo"
              >
                <RefreshCw size={14} /> Generovat
              </button>
              {password && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-2 bg-surface-muted hover:bg-surface border border-border rounded-lg text-text-muted hover:text-text text-sm transition-colors"
                  title="Kopírovat heslo"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : "Kopírovat"}
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Uživatel si může po přihlášení heslo změnit přes „Zapomenuté heslo".
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded"
            />
            Poslat pozvánku e-mailem s přihlašovacími údaji
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {submitting ? "Vytvářím…" : "Vytvořit uživatele"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-surface-muted hover:bg-surface border border-border rounded-lg text-text font-semibold transition-colors"
            >
              Zrušit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
