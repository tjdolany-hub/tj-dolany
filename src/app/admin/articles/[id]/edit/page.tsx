"use client";

import { useState, useEffect, use } from "react";
import { Save, X, CheckCircle } from "lucide-react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/utils";
import ImageUploader from "@/components/admin/ImageUploader";

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    content: "",
    summary: "",
    category: "aktuality",
    published: false,
    created_at: "",
  });
  const [images, setImages] = useState<{ url: string; alt?: string }[]>([]);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          title: data.title,
          content: data.content,
          summary: data.summary || "",
          category: data.category,
          published: data.published,
          created_at: data.created_at ? data.created_at.slice(0, 10) : "",
        });
        setImages(
          (data.article_images || []).map((img: { url: string; alt: string | null }) => ({
            url: img.url,
            alt: img.alt || undefined,
          }))
        );
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, images }),
    });

    if (res.ok) {
      setSaved(true);
    }
    setSaving(false);
  };

  const updateForm = (patch: Partial<typeof form>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };

  if (loading) return <p className="text-text-muted">Načítám...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Upravit článek</h1>
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text mb-1">Titulek</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateForm({ title: e.target.value })}
            required
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Kategorie</label>
            <select
              value={form.category}
              onChange={(e) => updateForm({ category: e.target.value })}
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
              onChange={(e) => updateForm({ created_at: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-1">Shrnutí</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => updateForm({ summary: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text mb-1">Obsah (Markdown)</label>
          <textarea
            value={form.content}
            onChange={(e) => updateForm({ content: e.target.value })}
            required
            rows={12}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text mb-1">Obrázky</label>
          <ImageUploader images={images} onChange={(imgs) => { setSaved(false); setImages(imgs); }} folder="articles" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text">Stav:</span>
          <button
            type="button"
            onClick={() => updateForm({ published: true })}
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
            onClick={() => updateForm({ published: false })}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              !form.published
                ? "bg-yellow-500 text-white"
                : "bg-surface border border-border text-text-muted hover:bg-yellow-50 hover:text-yellow-700"
            }`}
          >
            Koncept
          </button>
        </div>
        <div className="flex items-center gap-2">
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
            <X size={16} /> Zpět
          </Link>
          {saved && (
            <span className="flex items-center gap-1.5 text-green-500 text-sm font-semibold ml-2">
              <CheckCircle size={16} /> Uloženo
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
