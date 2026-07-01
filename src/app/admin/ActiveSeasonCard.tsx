"use client";

import { useState } from "react";
import { Save, CheckCircle } from "lucide-react";
import { getSeasonList } from "@/lib/utils";

export default function ActiveSeasonCard({ stored }: { stored: string | null }) {
  const seasons = getSeasonList();
  const [value, setValue] = useState<string>(stored ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active_season: value || null }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const e = await res.json().catch(() => null);
      alert(e?.error || "Chyba při ukládání");
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mt-8">
      <h2 className="text-lg font-bold text-text mb-1">Aktuální sezóna</h2>
      <p className="text-sm text-text-muted mb-3">
        Určuje, kterou sezónu ukazuje hlavní stránka a stránka Tým (forma, poslední zápas,
        TOP střelci, tabulka). Přepnutím na novou sezónu se statistiky „resetují&ldquo; na novou
        (zatím prázdnou) sezónu — stará data se nemažou a zůstávají dostupná přes výběr sezóny.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => { setSaved(false); setValue(e.target.value); }}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
        >
          <option value="">Automaticky (podle data)</option>
          {seasons.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-green-500 text-sm font-semibold">
            <CheckCircle size={16} /> Uloženo
          </span>
        )}
      </div>
    </div>
  );
}
