"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "ready" | "saving" | "error" | "done">(
    "verifying",
  );
  const [message, setMessage] = useState<string>("Ověřuji odkaz…");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function exchange() {
      // Newer PKCE flow: Supabase appends ?code=... on recovery redirects.
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("error");
          setMessage("Odkaz je neplatný nebo expiroval. Požádejte o nový.");
          return;
        }
        setStatus("ready");
        setMessage("");
        return;
      }

      // Legacy flow: token in URL hash (#access_token=...&type=recovery). The
      // supabase client picks it up automatically on init — check session.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus("ready");
        setMessage("");
        return;
      }

      setStatus("error");
      setMessage("Odkaz je neplatný nebo expiroval. Požádejte o nový.");
    }

    exchange();
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setMessage("Heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (password !== confirm) {
      setMessage("Hesla se neshodují.");
      return;
    }

    setStatus("saving");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("ready");
      setMessage("Nepodařilo se nastavit heslo: " + error.message);
      return;
    }
    setStatus("done");
    setMessage("Heslo bylo změněno. Přesměrovávám na přihlášení…");
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Image
          src="/logo.png"
          alt="TJ Dolany"
          width={64}
          height={64}
          className="mx-auto mb-4"
        />
        <h1 className="text-xl font-bold text-white">Nastavení nového hesla</h1>
        <p className="text-sm text-gray-400 mt-1">TJ Dolany</p>
      </div>

      {status === "verifying" && (
        <p className="text-center text-sm text-gray-400">{message}</p>
      )}

      {status === "error" && (
        <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red-light text-sm rounded-lg px-4 py-3 text-center">
          {message}
          <div className="mt-3">
            <a href="/login" className="underline text-white">
              Zpět na přihlášení
            </a>
          </div>
        </div>
      )}

      {(status === "ready" || status === "saving") && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red-light text-sm rounded-lg px-4 py-3">
              {message}
            </div>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Nové heslo
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 bg-brand-dark-light border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
              placeholder="Alespoň 8 znaků"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1">
              Heslo znovu
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 bg-brand-dark-light border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={status === "saving"}
            className="w-full bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {status === "saving" ? "Ukládám…" : "Uložit heslo"}
          </button>
        </form>
      )}

      {status === "done" && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 text-center">
          {message}
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <Suspense fallback={<p className="text-sm text-gray-400">Načítám…</p>}>
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
