"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pencil, Trash2, Plus } from "lucide-react";
import { formatDateCzech, CATEGORIES } from "@/lib/utils";

interface Article {
  id: string;
  title: string;
  category: string;
  published: boolean;
  created_at: string;
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArticles = () => {
    fetch("/api/articles?all=true&limit=100")
      .then((r) => r.json())
      .then((data) => setArticles(data.articles))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadArticles(); }, []);

  const deleteArticle = async (id: string) => {
    if (!confirm("Opravdu smazat tento článek?")) return;
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    loadArticles();
  };

  const categoryLabel = (val: string) =>
    CATEGORIES.find((c) => c.value === val)?.label || val;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Články</h1>
        <Link
          href="/admin/articles/new"
          className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> Nový článek
        </Link>
      </div>

      {loading ? (
        <p className="text-text-muted">Načítám...</p>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="text-left p-3 font-semibold text-text">Titulek</th>
                <th className="text-left p-3 font-semibold text-text">Kategorie</th>
                <th className="text-left p-3 font-semibold text-text">Datum</th>
                <th className="text-left p-3 font-semibold text-text">Stav</th>
                <th className="text-right p-3 font-semibold text-text">Akce</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-medium text-text">{a.title}</td>
                  <td className="p-3 text-text-muted">{categoryLabel(a.category)}</td>
                  <td className="p-3 text-text-muted">{formatDateCzech(a.created_at)}</td>
                  <td className="p-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      a.published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {a.published ? "Publikováno" : "Koncept"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/articles/${a.id}/edit`} className="text-blue-600 hover:text-blue-800 p-1">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => deleteArticle(a.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-text-muted">Zatím žádné články</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
