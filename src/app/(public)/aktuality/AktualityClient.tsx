"use client";

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

export default function AktualityClient({ articles }: { articles: Article[] }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2">Novinky</p>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">
          Aktuality
        </h1>
      </motion.div>

      {articles.length > 0 ? (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
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
          Zatím nemáme žádné aktuality.
        </p>
      )}
    </div>
  );
}
