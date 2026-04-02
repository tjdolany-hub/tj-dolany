"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, ImageIcon, Camera } from "lucide-react";
import { formatDateCzech, CATEGORIES } from "@/lib/utils";
import AnimatedSection, { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import { JerseyIcon, BallIcon, YellowCard, RedCard } from "@/components/ui/StatIcons";

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

interface LeagueStandingRow {
  position: number;
  team_name: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
  is_our_team: boolean;
  variant: string;
}

interface HomeClientProps {
  articles: SerializedArticle[];
  heroEvents: (HeroEvent | null)[];
  nextMatch: NextMatch | null;
  albums: SerializedAlbum[];
  clubBanner: ClubBanner;
  leagueStandings: LeagueStandingRow[];
  top5Scorers: { name: string; goals: number }[];
  top5Appearances: { name: string; count: number }[];
}

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
  const day = days[d.getDay()];
  const date = `${d.getDate()}.${d.getMonth() + 1}.`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${day} ${date} — ${time}`;
}

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];
function medalClass(i: number) { return i < 3 ? MEDAL_COLORS[i] : "text-text-muted"; }

export default function HomeClient({ articles, heroEvents, nextMatch, albums, clubBanner, leagueStandings, top5Scorers, top5Appearances }: HomeClientProps) {
  const featured = articles[0];
  const sidebar = articles.slice(1, 5);
  const [tableVariant, setTableVariant] = useState<"celkem" | "doma" | "venku">("celkem");

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
      {nextMatch && (() => {
        const tickerText = `⚽ Příští zápas: ${formatMatchDate(nextMatch.date)} — ${nextMatch.title}${nextMatch.location ? ` 📍 ${nextMatch.location}` : ""}`;
        return (
          <div className="bg-brand-red text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center">
              <span className="text-sm font-semibold tracking-wide text-center">
                {tickerText.split("").map((char, i) => (
                  <span
                    key={i}
                    className={char === " " ? undefined : "ticker-char"}
                    style={char !== " " ? { animationDelay: `${i * 0.06}s` } : undefined}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── CLUB BANNER ── */}
      <AnimatedSection>
        <section className="bg-surface">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-brand-dark rounded-2xl overflow-hidden shadow-xl flex flex-col md:flex-row">
              {/* Left — logo + name + position */}
              <div className="md:w-[30%] flex flex-col items-center justify-center px-6 py-6 border-b md:border-b-0 md:border-r border-white/10">
                <Image src="/logo.png" alt="TJ Dolany" width={64} height={64} className="drop-shadow-lg mb-3" />
                <h2 className="text-xl font-extrabold text-white tracking-tight">TJ Dolany</h2>
                <p className="text-xs text-gray-400 mt-0.5">Okresní přebor • Náchod</p>
                {clubBanner.leaguePosition && (
                  <div className="mt-3 text-center">
                    <span className="text-3xl font-extrabold text-brand-yellow">{clubBanner.leaguePosition}.</span>
                    <span className="block text-[10px] text-gray-400 uppercase tracking-wider">místo</span>
                  </div>
                )}
              </div>

              {/* Right — stacked rows */}
              <div className="md:w-[70%] divide-y divide-white/10">
                {/* Forma */}
                <div className="flex items-center gap-4 px-5 py-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-28 shrink-0">Forma</span>
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

                {/* Poslední zápas */}
                <div className="flex items-center gap-4 px-5 py-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-28 shrink-0">Poslední zápas</span>
                  {clubBanner.lastMatch ? (
                    (() => {
                      const matchContent = (
                        <span className="text-sm font-bold text-white group-hover:text-brand-red transition-colors">
                          {clubBanner.lastMatch.is_home ? "TJ Dolany" : clubBanner.lastMatch.opponent}
                          <span className="text-brand-yellow mx-1.5">{clubBanner.lastMatch.score_home}:{clubBanner.lastMatch.score_away}</span>
                          {clubBanner.lastMatch.is_home ? clubBanner.lastMatch.opponent : "TJ Dolany"}
                        </span>
                      );
                      return clubBanner.lastMatch.articleSlug ? (
                        <Link href={`/aktuality/${clubBanner.lastMatch.articleSlug}`} className="group flex items-center gap-2">
                          {matchContent}
                          <span className="text-[10px] text-brand-red font-medium">▸ referát</span>
                        </Link>
                      ) : (
                        <Link href="/tym" className="group flex items-center gap-2">
                          {matchContent}
                        </Link>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </div>

                {/* Nejlepší střelec */}
                <div className="flex items-center gap-4 px-5 py-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-28 shrink-0">Nejlepší střelec</span>
                  {clubBanner.topScorer ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{clubBanner.topScorer.name}</span>
                      <span className="text-xs text-brand-yellow font-bold">{clubBanner.topScorer.goals} gólů</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </div>

                {/* Nejvíce karet */}
                <div className="flex items-center gap-4 px-5 py-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-28 shrink-0">Nejvíce karet</span>
                  {clubBanner.topCards ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{clubBanner.topCards.name}</span>
                      <span className="flex items-center gap-1.5">
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
                      </span>
                    </div>
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

      {/* ── LEAGUE TABLE + STATS ── */}
      {leagueStandings.length > 0 && (
        <AnimatedSection>
          <section className="bg-surface">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-6 bg-brand-red rounded-full" />
                    <p className="text-xs font-semibold text-brand-red uppercase tracking-wider">Soutěž</p>
                  </div>
                  <h2 className="text-2xl font-bold text-text tracking-tight">Tabulka a statistiky</h2>
                </div>
                <Link href="/tym" className="text-sm text-text-muted hover:text-brand-red font-medium transition-colors hidden sm:flex items-center gap-1 group">
                  Kompletní statistiky <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left — League table (3/5) */}
                <div className="lg:col-span-3">
                  <div className="bg-surface-alt rounded-xl border border-border overflow-hidden">
                    {/* Variant tabs */}
                    <div className="flex border-b border-border">
                      {(["celkem", "doma", "venku"] as const).map((v) => {
                        const hasData = leagueStandings.some((s) => s.variant === v);
                        if (!hasData) return null;
                        return (
                          <button key={v} onClick={() => setTableVariant(v)}
                            className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${tableVariant === v ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"}`}>
                            {v === "celkem" ? "Celkem" : v === "doma" ? "Doma" : "Venku"}
                          </button>
                        );
                      })}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-surface-muted">
                            <th className="px-2 py-2.5 text-center font-semibold text-text-muted w-8">#</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-text-muted">Tým</th>
                            <th className="px-1.5 py-2.5 text-center font-semibold text-text-muted">Z</th>
                            <th className="px-1.5 py-2.5 text-center font-semibold text-text-muted">V</th>
                            <th className="px-1.5 py-2.5 text-center font-semibold text-text-muted">R</th>
                            <th className="px-1.5 py-2.5 text-center font-semibold text-text-muted">P</th>
                            <th className="px-1.5 py-2.5 text-center font-semibold text-text-muted">Skóre</th>
                            <th className="px-2 py-2.5 text-center font-bold text-text-muted">B</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leagueStandings
                            .filter((s) => s.variant === tableVariant)
                            .sort((a, b) => a.position - b.position)
                            .map((s) => (
                            <tr key={s.position} className={`border-b border-border last:border-0 transition-colors ${
                              s.is_our_team ? "bg-brand-red/10 font-bold" : "hover:bg-surface-muted"
                            }`}>
                              <td className="px-2 py-2 text-center font-bold text-text text-xs">{s.position}.</td>
                              <td className={`px-3 py-2 text-xs ${s.is_our_team ? "text-brand-red font-bold" : "text-text"}`}>{s.team_name}</td>
                              <td className="px-1.5 py-2 text-center text-text-muted text-xs">{s.matches_played}</td>
                              <td className="px-1.5 py-2 text-center text-text-muted text-xs">{s.wins}</td>
                              <td className="px-1.5 py-2 text-center text-text-muted text-xs">{s.draws}</td>
                              <td className="px-1.5 py-2 text-center text-text-muted text-xs">{s.losses}</td>
                              <td className="px-1.5 py-2 text-center text-text-muted text-xs">{s.goals_for}:{s.goals_against}</td>
                              <td className={`px-2 py-2 text-center font-bold text-xs ${s.is_our_team ? "text-brand-red" : "text-text"}`}>{s.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right — Top lists (2/5) */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Top 5 scorers */}
                  {top5Scorers.length > 0 && (
                    <div className="bg-surface-alt rounded-xl border border-border p-4">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BallIcon className="w-4 h-4 text-brand-red" /> Nejlepší střelci
                      </h3>
                      <div className="space-y-2">
                        {top5Scorers.map((s, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className={`w-5 text-xs font-bold text-right ${medalClass(i)}`}>{i + 1}.</span>
                            <span className={`flex-1 text-sm ${i < 3 ? "font-bold text-text" : "text-text"}`}>{s.name}</span>
                            <span className="flex items-center gap-1">
                              <BallIcon className="w-3.5 h-3.5 text-text-muted" />
                              <span className={`text-sm font-bold ${i === 0 ? "text-brand-red" : "text-text"}`}>{s.goals}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top 5 appearances */}
                  {top5Appearances.length > 0 && (
                    <div className="bg-surface-alt rounded-xl border border-border p-4">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <JerseyIcon className="w-4 h-4 text-brand-red" /> Nejvíce zápasů
                      </h3>
                      <div className="space-y-2">
                        {top5Appearances.map((p, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className={`w-5 text-xs font-bold text-right ${medalClass(i)}`}>{i + 1}.</span>
                            <span className={`flex-1 text-sm ${i < 3 ? "font-bold text-text" : "text-text"}`}>{p.name}</span>
                            <span className="flex items-center gap-1">
                              <JerseyIcon className="w-3.5 h-3.5 text-text-muted" />
                              <span className={`text-sm font-bold ${i === 0 ? "text-brand-red" : "text-text"}`}>{p.count}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center mt-6 sm:hidden">
                <Link href="/tym" className="text-sm text-text-muted hover:text-brand-red font-medium transition-colors inline-flex items-center gap-1">
                  Kompletní statistiky <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        </AnimatedSection>
      )}

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
