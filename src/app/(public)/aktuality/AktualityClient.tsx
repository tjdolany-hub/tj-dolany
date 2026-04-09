"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatDateCzech, CATEGORIES } from "@/lib/utils";
import AnimatedSection, { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import { ImageIcon, ChevronDown } from "lucide-react";

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string;
  created_at: string;
  article_images: { url: string; alt: string | null }[];
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
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
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

export default function AktualityClient({ articles }: { articles: Article[] }) {
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [yearFilter, setYearFilter] = useState<Set<number>>(new Set());

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    articles.forEach((a) => years.add(new Date(a.created_at).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [articles]);

  const toggleCat = (cat: string) => {
    setCatFilter((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

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
      if (catFilter.size > 0 && !catFilter.has(a.category)) return false;
      if (yearFilter.size > 0 && !yearFilter.has(new Date(a.created_at).getFullYear())) return false;
      return true;
    });
  }, [articles, catFilter, yearFilter]);

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
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
      </div>

      {/* Filters — sticky */}
      <div className="sticky top-16 z-30 bg-surface-muted/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap justify-center gap-3">
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
        </div>
        <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filtered.length > 0 ? (
          <StaggerContainer key={`${[...catFilter].join(",")}-${[...yearFilter].join(",")}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
    </div>
  );
}
