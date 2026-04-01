"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { marked } from "marked";
import { ArrowLeft } from "lucide-react";
import { formatDateCzech, CATEGORIES } from "@/lib/utils";

interface ArticleImage {
  id: string;
  url: string;
  alt: string | null;
  sort_order: number;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  category: string;
  created_at: string;
  article_images: ArticleImage[];
}

export default function ArticleDetail({ article }: { article: Article }) {
  const html = marked.parse(article.content) as string;
  const heroImage = article.article_images?.[0];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          href="/aktuality"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-brand-red transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Zpět na aktuality
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-brand-red uppercase tracking-wider">
            {CATEGORIES.find((c) => c.value === article.category)?.label}
          </span>
          <span className="text-xs text-text-muted">{formatDateCzech(article.created_at)}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-text tracking-tight mb-6">
          {article.title}
        </h1>

        {heroImage && (
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-8">
            <Image
              src={heroImage.url}
              alt={heroImage.alt || article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
              priority
            />
          </div>
        )}

        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {article.article_images.length > 1 && (
          <div className="mt-10">
            <h3 className="text-lg font-bold text-text mb-4">Fotogalerie</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {article.article_images.slice(1).map((img) => (
                <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={img.url}
                    alt={img.alt || ""}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
