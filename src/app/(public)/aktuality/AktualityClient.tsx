"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatDateCzech, CATEGORIES } from "@/lib/utils";
import AnimatedSection, { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import { ImageIcon } from "lucide-react";

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string;
  created_at: string;
  article_images: { url: string; alt: string | null }[];
}

const FILTER_OPTIONS = [
  { value: "vse", label: "Vše" },
  ...CATEGORIES,
];

export default function AktualityClient({ articles }: { articles: Article[] }) {
  const [filter, setFilter] = useState("vse");
  const [yearFilter, setYearFilter] = useState<Set<number>>(new Set());

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

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (filter !== "vse" && a.category !== filter) return false;
      if (yearFilter.size > 0 && !yearFilter.has(new Date(a.created_at).getFullYear())) return false;
      return true;
    });
  }, [articles, filter, yearFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2 flex items-center justify-center gap-2"><span className="w-1 h-5 bg-brand-red rounded-full" />Novinky</p>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">
          Aktuality
        </h1>
      </motion.div>

      {/* Filters — sticky */}
      <div className="sticky top-16 z-30 bg-surface-muted/95 backdrop-blur-sm py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-10 border-b border-border">
        <div className="flex flex-wrap justify-center gap-2">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filter === f.value
                  ? "bg-brand-red text-white"
                  : "bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="w-px h-8 bg-border mx-1 self-center" />
          {availableYears.map((y) => (
            <button
              key={y}
              onClick={() => toggleYear(y)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                yearFilter.has(y)
                  ? "bg-brand-yellow text-brand-dark"
                  : "bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted"
              }`}
            >
              {y}
            </button>
          ))}
          {yearFilter.size > 0 && (
            <button
              onClick={() => setYearFilter(new Set())}
              className="px-2 py-2 text-xs text-text-muted hover:text-text transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <StaggerContainer key={`${filter}-${[...yearFilter].join(",")}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((article) => (
            <StaggerItem key={article.id}>
              <Link
                href={`/aktuality/${article.slug}`}
                className="group block bg-surface rounded-xl border border-border overflow-hidden hover:shadow-xl hover:shadow-brand-red/10 hover:border-brand-red/20 transition-all h-full"
              >
                {article.article_images?.[0] ? (
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={article.article_images[0].url}
                      alt={article.article_images[0].alt || article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-brand-dark/5 to-brand-red/5 flex items-center justify-center">
                    <ImageIcon size={32} className="text-text-muted/30" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider">
                      {CATEGORIES.find((c) => c.value === article.category)?.label}
                    </span>
                    <span className="text-[10px] text-text-muted">{formatDateCzech(article.created_at)}</span>
                  </div>
                  <h3 className="font-bold text-text text-lg tracking-tight group-hover:text-brand-red transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="text-sm text-text-muted mt-2 line-clamp-3">{article.summary}</p>
                  )}
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <p className="text-center text-text-muted py-12 text-lg">
          Žádné aktuality pro vybraný filtr.
        </p>
      )}
    </div>
  );
}
