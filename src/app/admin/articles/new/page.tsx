"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/utils";
import ImageUploader from "@/components/admin/ImageUploader";

export default function NewArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    summary: "",
    category: "aktuality",
    published: false,
    created_at: new Date().toISOString().slice(0, 10),
  });
  const [images, setImages] = useState<{ url: string; alt?: string }[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, images }),
    });

    if (res.ok) {
      router.push("/admin/articles");
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || `Chyba při ukládání (${res.status})`);
    }
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Nový článek</h1>
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text mb-1">Titulek</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Kategorie</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Datum článku</label>
            <input
              type="date"
              value={form.created_at}
              onChange={(e) => setForm({ ...form, created_at: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Shrnutí</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text mb-1">Obsah (Markdown)</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
            rows={12}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text mb-1">Obrázky</label>
          <ImageUploader images={images} onChange={setImages} folder="articles" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text">Stav:</span>
          <button
            type="button"
            onClick={() => setForm({ ...form, published: true })}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              form.published
                ? "bg-green-600 text-white"
                : "bg-surface border border-border text-text-muted hover:bg-green-50 hover:text-green-700"
            }`}
          >
            Publikováno
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, published: false })}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              !form.published
                ? "bg-yellow-500 text-white"
                : "bg-surface border border-border text-text-muted hover:bg-yellow-50 hover:text-yellow-700"
            }`}
          >
            Koncept
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
          </button>
          <Link
            href="/admin/articles"
            className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <X size={16} /> Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}
