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

interface HeroEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  event_type: string;
  articleSlug?: string | null;
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

interface ClubBanner {
  form: ("V" | "R" | "P")[];
  topScorer: { name: string; goals: number } | null;
  topCards: { name: string; yellows: number; reds: number; score: number } | null;
  lastMatch: {
    opponent: string;
    score_home: number;
    score_away: number;
    is_home: boolean;
    articleSlug: string | null;
  } | null;
  leaguePosition: number | null;
}

interface HomeClientProps {
  articles: SerializedArticle[];
  heroEvents: (HeroEvent | null)[];
  nextMatch: NextMatch | null;
  albums: SerializedAlbum[];
  clubBanner: ClubBanner;
}

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
  const day = days[d.getDay()];
  const date = `${d.getDate()}.${d.getMonth() + 1}.`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${day} ${date} — ${time}`;
}

export default function HomeClient({ articles, heroEvents, nextMatch, albums, clubBanner }: HomeClientProps) {
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
        <div className="bg-brand-red text-white overflow-hidden ticker-container">
          <div className="py-2.5 whitespace-nowrap animate-ticker inline-flex items-center gap-8">
            {[0, 1, 2].map((i) => (
              <span key={i} className="inline-flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="font-bold text-sm uppercase tracking-wide">Příští zápas</span>
                </span>
                <span className="text-sm font-medium">
                  {formatMatchDate(nextMatch.date)} — {nextMatch.title}
                  {nextMatch.location && (
                    <span className="text-white/70 ml-2">
                      <MapPin size={12} className="inline -mt-0.5 mr-0.5" />
                      {nextMatch.location}
                    </span>
                  )}
                </span>
                <span className="text-white/30 mx-4">●</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── CLUB BANNER ── */}
      <AnimatedSection>
        <section className="bg-surface">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-brand-dark rounded-2xl overflow-hidden shadow-xl">
              {/* Header */}
              <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10">
                <Image src="/logo.png" alt="TJ Dolany" width={40} height={40} className="drop-shadow-lg" />
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">TJ Dolany</h2>
                  <p className="text-xs text-gray-400">Okresní přebor • Náchod</p>
                </div>
                {clubBanner.leaguePosition && (
                  <div className="ml-auto text-center">
                    <span className="text-2xl font-extrabold text-brand-yellow">{clubBanner.leaguePosition}.</span>
                    <span className="block text-[10px] text-gray-400 uppercase tracking-wider">místo</span>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
                {/* Forma */}
                <div className="px-4 py-4">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Forma</span>
                  <div className="flex gap-1.5">
                    {clubBanner.form.length > 0 ? clubBanner.form.map((r, i) => (
                      <span key={i} className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center ${
                        r === "V" ? "bg-green-500 text-white" :
                        r === "R" ? "bg-yellow-500 text-white" :
                        "bg-red-500 text-white"
                      }`}>{r}</span>
                    )) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </div>
                </div>

                {/* Nejlepší střelec */}
                <div className="px-4 py-4">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Nejlepší střelec</span>
                  {clubBanner.topScorer ? (
                    <div>
                      <span className="text-sm font-bold text-white">{clubBanner.topScorer.name}</span>
                      <span className="text-xs text-brand-yellow ml-1.5 font-bold">{clubBanner.topScorer.goals} gólů</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </div>

                {/* Nejvíce karet */}
                <div className="px-4 py-4">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Nejvíce karet</span>
                  {clubBanner.topCards ? (
                    <div>
                      <span className="text-sm font-bold text-white">{clubBanner.topCards.name}</span>
                      <span className="flex items-center gap-1.5 mt-0.5">
                        {clubBanner.topCards.yellows > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="w-3 h-4 rounded-sm bg-yellow-400 inline-block" />
                            <span className="text-xs text-gray-300 font-medium">{clubBanner.topCards.yellows}</span>
                          </span>
                        )}
                        {clubBanner.topCards.reds > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="w-3 h-4 rounded-sm bg-red-500 inline-block" />
                            <span className="text-xs text-gray-300 font-medium">{clubBanner.topCards.reds}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">({clubBanner.topCards.score} b.)</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </div>

                {/* Poslední zápas */}
                <div className="px-4 py-4">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Poslední zápas</span>
                  {clubBanner.lastMatch ? (
                    clubBanner.lastMatch.articleSlug ? (
                      <Link href={`/aktuality/${clubBanner.lastMatch.articleSlug}`} className="group">
                        <span className="text-sm font-bold text-white group-hover:text-brand-red transition-colors">
                          {clubBanner.lastMatch.is_home ? "TJ Dolany" : clubBanner.lastMatch.opponent}
                          <span className="text-brand-yellow mx-1">{clubBanner.lastMatch.score_home}:{clubBanner.lastMatch.score_away}</span>
                          {clubBanner.lastMatch.is_home ? clubBanner.lastMatch.opponent : "TJ Dolany"}
                        </span>
                        <span className="text-[10px] text-brand-red block mt-0.5 font-medium">▸ referát</span>
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-white">
                        {clubBanner.lastMatch.is_home ? "TJ Dolany" : clubBanner.lastMatch.opponent}
                        <span className="text-brand-yellow mx-1">{clubBanner.lastMatch.score_home}:{clubBanner.lastMatch.score_away}</span>
                        {clubBanner.lastMatch.is_home ? clubBanner.lastMatch.opponent : "TJ Dolany"}
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

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
                      <div className="h-64 md:h-80 bg-gradient-to-br from-brand-red/15 via-brand-dark to-brand-dark flex items-center justify-center">
                        <div className="text-center">
                          <div className="flex items-center gap-2 justify-center mb-3">
                            <span className="text-xs font-bold text-white bg-brand-red px-2.5 py-1 rounded-md uppercase tracking-wider">
                              {CATEGORIES.find((c) => c.value === featured.category)?.label}
                            </span>
                            <span className="text-xs text-gray-300">{formatDateCzech(featured.created_at)}</span>
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

      {/* ── EVENTS — 3 cards: past | next (highlighted) | future ── */}
      {heroEvents.some(Boolean) && (
        <AnimatedSection>
          <section className="bg-surface">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-1 h-6 bg-brand-red rounded-full" />
                  <p className="text-xs font-semibold text-brand-red uppercase tracking-wider">Akce TJ Dolany</p>
                </div>
                <h2 className="text-2xl font-bold text-text tracking-tight">Co nás čeká</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                {heroEvents.map((event, idx) => {
                  if (!event) return <div key={idx} />;
                  const d = new Date(event.date);
                  const isHighlighted = idx === 1;
                  const isPast = idx === 0;
                  const href = isPast && event.articleSlug
                    ? `/aktuality/${event.articleSlug}`
                    : "/plan-akci";
                  return (
                    <Link key={event.id} href={href}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`text-center rounded-2xl p-6 border transition-all duration-300 cursor-pointer h-full ${
                          isHighlighted
                            ? "bg-brand-red/10 border-brand-red/40 shadow-lg shadow-brand-red/10 scale-105 ring-2 ring-brand-red/20"
                            : isPast
                              ? "bg-surface-alt border-border-strong opacity-70 hover:opacity-90"
                              : "bg-surface-alt border-border-strong shadow-sm hover:shadow-lg hover:border-brand-red/40 hover:-translate-y-1"
                        }`}
                      >
                        {isPast && (
                          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Proběhlo</span>
                        )}
                        {isHighlighted && (
                          <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider">Příští akce</span>
                        )}
                        <div className={`w-12 h-12 mx-auto mb-3 mt-2 rounded-full flex items-center justify-center ${
                          isHighlighted ? "bg-brand-red/20" : "bg-brand-red/10"
                        }`}>
                          <Calendar size={20} className="text-brand-red" />
                        </div>
                        <span className={`text-lg font-bold ${isHighlighted ? "text-brand-red" : "text-brand-red/80"}`}>
                          {d.getDate()}.{d.getMonth() + 1}.
                        </span>
                        <h3 className="font-semibold text-text text-sm leading-snug mt-2 line-clamp-2">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-xs text-text-muted mt-2 line-clamp-2">{event.description}</p>
                        )}
                      </motion.div>
                    </Link>
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
