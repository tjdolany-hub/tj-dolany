"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin, ImageIcon, Camera } from "lucide-react";
import { formatDateCzech, CATEGORIES } from "@/lib/utils";
import AnimatedSection, { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";

interface SerializedArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  created_at: string;
  updated_at: string;
  article_images: { url: string; alt: string | null }[];
}

interface SerializedEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  poster: string | null;
}

interface NextMatch {
  title: string;
  date: string;
  location: string | null;
}

interface SerializedAlbum {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  event_date: string | null;
}

interface HomeClientProps {
  articles: SerializedArticle[];
  events: SerializedEvent[];
  nextMatch: NextMatch | null;
  albums: SerializedAlbum[];
}

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
  const day = days[d.getDay()];
  const date = `${d.getDate()}.${d.getMonth() + 1}.`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${day} ${date} — ${time}`;
}

export default function HomeClient({ articles, events, nextMatch, albums }: HomeClientProps) {
  const featured = articles[0];
  const sidebar = articles.slice(1, 5);

  return (
    <>
      {/* ── COMPACT HERO + LOGO ── */}
      <section className="relative bg-brand-dark overflow-hidden -mt-16 pt-16">
        <div className="absolute inset-0">
          <Image
            src="/hero-team.jpg"
            alt="Tým TJ Dolany"
            fill
            className="object-cover object-left brightness-75"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-brand-dark/40" />
          {/* Diagonal red-yellow stripe from left ~30% */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(
                115deg,
                rgba(196, 30, 58, 0.85) 0%,
                rgba(196, 30, 58, 0.7) 12%,
                rgba(245, 197, 24, 0.6) 20%,
                rgba(245, 197, 24, 0.3) 26%,
                transparent 32%
              )`,
            }}
          />
          {/* Mirrored diagonal stripe from right — yellow inside, red on edge */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(
                295deg,
                rgba(196, 30, 58, 0.85) 0%,
                rgba(196, 30, 58, 0.7) 12%,
                rgba(245, 197, 24, 0.6) 20%,
                rgba(245, 197, 24, 0.3) 26%,
                transparent 32%
              )`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/30 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-12 md:py-16 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              className="relative w-24 h-24 md:w-32 md:h-32 mb-4"
            >
              <Image
                src="/logo.png"
                alt="TJ Dolany - znak"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
              <div className="absolute inset-0 bg-brand-yellow/15 rounded-full blur-2xl -z-10 scale-150" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight"
            >
              TJ <span className="gradient-text">Dolany</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-2 text-sm md:text-base text-gray-400"
            >
              Fotbal a komunita v srdci Královéhradeckého kraje
            </motion.p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-red via-brand-yellow to-brand-red" style={{ backgroundSize: "200% 100%", animation: "gradient-shift 3s ease infinite" }} />
      </section>

      {/* ── MATCH TICKER ── */}
      {nextMatch && (
        <div className="bg-brand-red text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-3 py-2.5">
              <span className="shrink-0 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="font-bold text-sm uppercase tracking-wide">Příští zápas</span>
              </span>
              <span className="shrink-0 text-sm font-medium">
                {formatMatchDate(nextMatch.date)} — {nextMatch.title}
                {nextMatch.location && (
                  <span className="text-white/70 ml-2">
                    <MapPin size={12} className="inline -mt-0.5 mr-0.5" />
                    {nextMatch.location}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── FEATURED ARTICLE + SIDEBAR ── */}
      <AnimatedSection>
        <section className="bg-surface-alt">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-6 bg-brand-red rounded-full" />
                  <p className="text-xs font-semibold text-brand-red uppercase tracking-wider">Novinky</p>
                </div>
                <h2 className="text-2xl font-bold text-text tracking-tight">Aktuality</h2>
              </div>
              <Link href="/aktuality" className="text-sm text-text-muted hover:text-brand-red font-medium transition-colors hidden sm:flex items-center gap-1 group">
                Všechny články <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {featured && (
                <motion.div
                  className="lg:col-span-7"
                  whileHover={{ y: -5, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Link
                    href={`/aktuality/${featured.slug}`}
                    className="group block bg-surface rounded-2xl border border-border-strong shadow-lg overflow-hidden hover:shadow-2xl hover:shadow-brand-red/15 hover:border-brand-red/50 transition-all duration-300 h-full"
                  >
                    {featured.article_images?.[0] ? (
                      <div className="relative h-64 md:h-80 overflow-hidden">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                          style={{ backgroundImage: `url(${featured.article_images[0].url})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-white bg-brand-red px-2.5 py-1 rounded-md uppercase tracking-wider shadow-md">
                              {CATEGORIES.find((c) => c.value === featured.category)?.label}
                            </span>
                            <span className="text-xs text-white/80 font-medium">{formatDateCzech(featured.created_at)}</span>
                          </div>
                          <h3 className="text-xl md:text-2xl font-bold text-white leading-tight drop-shadow-lg">
                            {featured.title}
                          </h3>
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 md:h-80 bg-gradient-to-br from-brand-dark to-brand-dark-light flex items-center justify-center">
                        <div className="text-center">
                          <div className="flex items-center gap-2 justify-center mb-3">
                            <span className="text-xs font-bold text-white bg-brand-red px-2.5 py-1 rounded-md uppercase tracking-wider">
                              {CATEGORIES.find((c) => c.value === featured.category)?.label}
                            </span>
                            <span className="text-xs text-gray-400">{formatDateCzech(featured.created_at)}</span>
                          </div>
                          <h3 className="text-xl md:text-2xl font-bold text-white px-6">{featured.title}</h3>
                        </div>
                      </div>
                    )}
                    {featured.summary && (
                      <div className="p-5 border-t border-border">
                        <p className="text-sm text-text-muted leading-relaxed line-clamp-3">{featured.summary}</p>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-red mt-3 group-hover:gap-2 transition-all">
                          Číst článek <ArrowRight size={14} />
                        </span>
                      </div>
                    )}
                  </Link>
                </motion.div>
              )}

              <StaggerContainer className="lg:col-span-5 flex flex-col gap-3">
                {sidebar.map((article) => (
                  <StaggerItem key={article.id}>
                    <Link
                      href={`/aktuality/${article.slug}`}
                      className="group flex gap-4 bg-surface rounded-xl border border-border-strong shadow-sm p-3 hover:border-brand-red/50 hover:shadow-lg hover:shadow-brand-red/10 hover:-translate-y-1 transition-all duration-300"
                    >
                      {article.article_images?.[0] ? (
                        <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden ring-1 ring-border-strong">
                          <Image
                            src={article.article_images[0].url}
                            alt={article.article_images[0].alt || article.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-115"
                            sizes="80px"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 shrink-0 rounded-lg bg-surface-alt flex items-center justify-center ring-1 ring-border-strong">
                          <ImageIcon size={20} className="text-text-muted/50" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider">
                            {CATEGORIES.find((c) => c.value === article.category)?.label}
                          </span>
                          <span className="text-[10px] text-text-muted">{formatDateCzech(article.created_at)}</span>
                        </div>
                        <h3 className="font-semibold text-text group-hover:text-brand-red transition-colors text-sm leading-snug line-clamp-2">
                          {article.title}
                        </h3>
                        {article.summary && (
                          <p className="text-xs text-text-muted mt-1 line-clamp-1">{article.summary}</p>
                        )}
                      </div>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            <div className="text-center mt-6 sm:hidden">
              <Link href="/aktuality" className="text-sm text-text-muted hover:text-brand-red font-medium transition-colors inline-flex items-center gap-1">
                Všechny články <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ── section divider ── */}
      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* ── EVENTS ── */}
      {events.length > 0 && (
        <AnimatedSection>
          <section className="bg-surface">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-1 h-6 bg-brand-red rounded-full" />
                  <p className="text-xs font-semibold text-brand-red uppercase tracking-wider">Následující akce</p>
                </div>
                <h2 className="text-2xl font-bold text-text tracking-tight">Co nás čeká</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {events.slice(0, 4).map((event) => {
                  const d = new Date(event.date);
                  return (
                    <div key={event.id} className="text-center">
                      <div className="bg-surface-alt rounded-2xl p-5 border border-border-strong shadow-sm hover:shadow-lg hover:border-brand-red/40 hover:-translate-y-1 transition-all duration-300">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-brand-red/10 flex items-center justify-center">
                          <Calendar size={20} className="text-brand-red" />
                        </div>
                        <span className="text-lg font-bold text-brand-red">
                          {d.getDate()}.{d.getMonth() + 1}.
                        </span>
                        <h3 className="font-semibold text-text text-sm leading-snug mt-2 line-clamp-2">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-xs text-text-muted mt-2 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center mt-6">
                <Link href="/plan-akci" className="text-sm text-text-muted hover:text-brand-red font-medium transition-colors inline-flex items-center gap-1 group">
                  Všechny akce <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </section>
        </AnimatedSection>
      )}

      {/* ── section divider ── */}
      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* ── PHOTO GALLERY ── */}
      {albums.length > 0 && (
        <AnimatedSection>
          <section className="bg-surface-alt">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-6 bg-brand-red rounded-full" />
                  <p className="text-xs font-semibold text-brand-red uppercase tracking-wider">Fotogalerie</p>
                </div>
                <h2 className="text-2xl font-bold text-text tracking-tight">Z našich akcí</h2>
              </div>
              <Link href="/galerie" className="text-sm text-text-muted hover:text-brand-red font-medium transition-colors hidden sm:flex items-center gap-1 group">
                Všechny galerie <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {albums.map((album) => (
                <StaggerItem key={album.id}>
                  <Link
                    href={`/galerie/${album.slug}`}
                    className="group block relative rounded-xl overflow-hidden aspect-[4/3] bg-brand-dark"
                  >
                    {album.cover_url ? (
                      <Image
                        src={album.cover_url}
                        alt={album.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand-dark-light flex items-center justify-center">
                        <Camera size={32} className="text-text-muted/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{album.title}</h3>
                      {album.event_date && (
                        <span className="text-xs text-white/70">{formatDateCzech(album.event_date)}</span>
                      )}
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <div className="text-center mt-6 sm:hidden">
              <Link href="/galerie" className="text-sm text-text-muted hover:text-brand-red font-medium transition-colors inline-flex items-center gap-1">
                Všechny galerie <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          </section>
        </AnimatedSection>
      )}

      {/* ── JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsOrganization",
            name: "TJ Dolany",
            sport: "Football",
            foundingDate: "1970",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Dolany u Jaroměře",
              addressRegion: "Královéhradecký kraj",
              addressCountry: "CZ",
            },
            url: "https://tjdolany.net",
          }),
        }}
      />
    </>
  );
}
