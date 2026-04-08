"use client";

import { useState } from "react";
import { BookOpen, Download, FileText, Calendar } from "lucide-react";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

export default function AdminKronikaPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ year: year.toString() });
      if (month !== null) {
        params.set("month", (month + 1).toString());
      }

      const res = await fetch(`/api/kronika?${params.toString()}`);
      if (!res.ok) {
        alert("Chyba při generování dokumentu");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const periodLabel = month !== null
        ? `${MONTH_NAMES[month].toLowerCase()}-${year}`
        : year.toString();
      a.download = `kronika-tj-dolany-${periodLabel}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-text mb-6">Kronika</h1>

      <div className="bg-surface rounded-xl border border-border p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-red/10 rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-brand-red" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Podklady do kroniky</h2>
            <p className="text-sm text-text-muted">
              Stáhněte Word dokument se všemi publikovanými články a fotkami za zvolené období.
              U zápasů se zobrazí číslo utkání a typ (mistrovský/přátelský).
            </p>
          </div>
        </div>

        {/* Year selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text mb-2 flex items-center gap-2">
            <Calendar size={14} /> Rok
          </label>
          <div className="flex gap-2">
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  year === y
                    ? "bg-brand-red text-white"
                    : "bg-surface-muted border border-border text-text-muted hover:text-text"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Month selection (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-text mb-2 flex items-center gap-2">
            <FileText size={14} /> Měsíc <span className="font-normal text-text-muted">(volitelné — prázdné = celý rok)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMonth(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                month === null
                  ? "bg-brand-yellow text-brand-dark"
                  : "bg-surface-muted border border-border text-text-muted hover:text-text"
              }`}
            >
              Celý rok
            </button>
            {MONTH_NAMES.map((name, idx) => (
              <button
                key={idx}
                onClick={() => setMonth(idx)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  month === idx
                    ? "bg-brand-yellow text-brand-dark"
                    : "bg-surface-muted border border-border text-text-muted hover:text-text"
                }`}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-6 py-3 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          <Download size={18} />
          {downloading ? "Generuji dokument..." : "Stáhnout Word dokument"}
        </button>

        <p className="mt-4 text-xs text-text-muted">
          Dokument obsahuje všechny publikované články za vybrané období včetně fotek.
          U zápasových článků je uvedeno číslo utkání (např. #2175) a typ zápasu.
        </p>
      </div>
    </div>
  );
}
