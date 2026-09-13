"use client";

import { RotateCcw } from "lucide-react";

// Shown when a public page's critical data failed to load (see assertLoaded in lib/supabase/query.ts)
export default function PublicError() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <h1 className="text-2xl font-bold text-text tracking-tight mb-3">Nepodařilo se načíst data</h1>
      <p className="text-text-muted mb-8">Omlouváme se, stránku se teď nepodařilo načíst. Zkuste ji prosím obnovit.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red-dark text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
      >
        <RotateCcw size={16} /> Obnovit stránku
      </button>
    </div>
  );
}
