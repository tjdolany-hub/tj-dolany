"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { CATEGORIES } from "@/lib/utils";
import ImageUploader from "@/components/admin/ImageUploader";

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    content: "",
    summary: "",
    category: "aktuality",
    published: false,
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
      router.push("/admin/articles");
    }
    setSaving(false);
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
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold text-text">Publikovat</span>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
        </button>
      </form>
    </div>
  );
}
