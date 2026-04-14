"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Nepodařilo se odeslat žádost");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="TJ Dolany"
            width={64}
            height={64}
            className="mx-auto mb-4"
          />
          <h1 className="text-xl font-bold text-white">Obnovení hesla</h1>
          <p className="text-sm text-gray-400 mt-1">TJ Dolany</p>
        </div>

        {sent ? (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 text-center">
            Pokud e-mail existuje, poslali jsme na něj odkaz pro obnovení hesla.
            <div className="mt-3">
              <Link href="/login" className="underline text-white">
                Zpět na přihlášení
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red-light text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <p className="text-sm text-gray-400">
              Zadejte svůj e-mail a pošleme Vám odkaz pro nastavení nového hesla.
            </p>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-brand-dark-light border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
                placeholder="vas@email.cz"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Odesílám…" : "Odeslat odkaz"}
            </button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-gray-400 hover:text-white">
                Zpět na přihlášení
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
