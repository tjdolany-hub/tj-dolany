"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Pencil, Trash2, Plus, Share2, Copy, X, ExternalLink, ChevronDown } from "lucide-react";
import { formatDateCzech, CATEGORIES } from "@/lib/utils";

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  published: boolean;
  created_at: string;
}

function FilterDropdown({ label, options, selected, onToggle, onClear }: {
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabels = options.filter((o) => selected.has(o.value)).map((o) => o.label);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
          selected.size > 0
            ? "bg-brand-red/10 border-brand-red/30 text-brand-red"
            : "bg-surface border-border text-text-muted hover:text-text hover:bg-surface-muted"
        }`}
      >
        {selected.size > 0 ? `${label}: ${selectedLabels.join(", ")}` : label}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-muted cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selected.has(o.value)}
                onChange={() => onToggle(o.value)}
                className="rounded border-border accent-brand-red"
              />
              {o.label}
            </label>
          ))}
          {selected.size > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
              >
                Zrušit filtr
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialog, setShareDialog] = useState<{ slug: string; title: string } | null>(null);
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [yearFilter, setYearFilter] = useState<Set<number>>(new Set());

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

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    articles.forEach((a) => years.add(new Date(a.created_at).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [articles]);

  const toggleYear = (year: number) => {
    setYearFilter((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleCat = (cat: string) => {
    setCatFilter((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (catFilter.size > 0 && !catFilter.has(a.category)) return false;
      if (yearFilter.size > 0 && !yearFilter.has(new Date(a.created_at).getFullYear())) return false;
      return true;
    });
  }, [articles, catFilter, yearFilter]);

  const togglePublished = async (id: string, current: boolean) => {
    await fetch(`/api/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !current }),
    });
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, published: !current } : a));
  };

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

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterDropdown
          label="Kategorie"
          options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          selected={catFilter}
          onToggle={toggleCat}
          onClear={() => setCatFilter(new Set())}
        />
        <FilterDropdown
          label="Rok"
          options={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
          selected={new Set([...yearFilter].map(String))}
          onToggle={(v) => toggleYear(Number(v))}
          onClear={() => setYearFilter(new Set())}
        />
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
                <th className="text-left p-3 font-semibold text-text">Datum článku</th>
                <th className="text-left p-3 font-semibold text-text">Stav</th>
                <th className="text-right p-3 font-semibold text-text">Akce</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-medium text-text">{a.title}</td>
                  <td className="p-3 text-text-muted">{categoryLabel(a.category)}</td>
                  <td className="p-3 text-text-muted">{formatDateCzech(a.created_at)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => togglePublished(a.id, a.published)}
                      className={`text-xs font-bold px-2 py-1 rounded cursor-pointer transition-colors ${
                        a.published ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      }`}
                      title={a.published ? "Klikni pro skrytí" : "Klikni pro publikování"}
                    >
                      {a.published ? "Publikováno" : "Koncept"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      {a.published && (
                        <button onClick={() => setShareDialog({ slug: a.slug, title: a.title })} className="text-blue-500 hover:text-blue-700 p-1" title="Sdílet na Facebook">
                          <Share2 size={16} />
                        </button>
                      )}
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

      {/* Share dialog */}
      {shareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShareDialog(null)}>
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Share2 size={20} className="text-brand-red" /> Sdílet článek
              </h3>
              <button onClick={() => setShareDialog(null)} className="text-text-muted hover:text-text">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-text-muted truncate">{shareDialog.title}</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const url = `https://tjdolany.net/aktuality/${shareDialog.slug}`;
                  const quote = `${shareDialog.title}\n\nCelý článek na tjdolany.net`;
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`, "_blank", "width=600,height=400");
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white rounded-lg font-semibold text-sm transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Sdílet na Facebook
                <ExternalLink size={14} className="ml-auto opacity-70" />
              </button>
              <button
                onClick={async () => {
                  const url = `https://tjdolany.net/aktuality/${shareDialog.slug}`;
                  await navigator.clipboard.writeText(url);
                  const btn = document.getElementById("copy-link-btn-articles");
                  if (btn) btn.textContent = "Zkopírováno!";
                  setTimeout(() => { if (btn) btn.textContent = "Kopírovat odkaz"; }, 2000);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-surface-muted hover:bg-border text-text rounded-lg font-semibold text-sm border border-border transition-colors"
              >
                <Copy size={18} />
                <span id="copy-link-btn-articles">Kopírovat odkaz</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
