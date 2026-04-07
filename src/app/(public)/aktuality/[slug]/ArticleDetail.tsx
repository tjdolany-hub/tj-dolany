"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { marked } from "marked";
import { ArrowLeft } from "lucide-react";
import { formatDateCzech, CATEGORIES } from "@/lib/utils";
import { getTeamLogo, DOLANY_LOGO } from "@/lib/team-logos";
import { BallIcon, YellowCard, RedCard } from "@/components/ui/StatIcons";

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

export interface MatchData {
  id: string;
  date: string;
  opponent: string;
  score_home: number;
  score_away: number;
  is_home: boolean;
  competition: string | null;
  season: string | null;
  halftime_home: number | null;
  halftime_away: number | null;
  venue: string | null;
  video_url: string | null;
  opponent_scorers: string | null;
  opponent_cards: string | null;
  round: string | null;
  referee: string | null;
  delegate: string | null;
  spectators: number | null;
  match_number: string | null;
  lineups: {
    playerName: string;
    is_starter: boolean;
    is_captain: boolean;
    number: number | null;
  }[];
  scorers: {
    playerName: string;
    goals: number;
    minute: number | null;
    is_penalty: boolean;
  }[];
  cards: {
    playerName: string;
    card_type: "yellow" | "red";
    minute: number | null;
  }[];
  opponentLineup: {
    name: string;
    number: number | null;
    position: string | null;
    is_starter: boolean;
    is_captain: boolean;
  }[];
  opponentScorers: {
    name: string;
    minute: number | null;
    is_penalty: boolean;
  }[];
  opponentCards: {
    name: string;
    card_type: "yellow" | "red";
    minute: number | null;
  }[];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function renderContentWithVideo(html: string): string {
  return html.replace(
    /<a href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^"]+)">[^<]+<\/a>/g,
    (fullMatch, url) => {
      const videoId = extractYouTubeId(url);
      if (!videoId) return fullMatch;
      return `<div class="relative w-full aspect-video rounded-xl overflow-hidden my-4"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="absolute inset-0 w-full h-full"></iframe></div>`;
    }
  );
}

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes();
  const time = h === 0 && m === 0 ? "" : ` ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  return `${day}.${month}.${year}${time}`;
}

// ─── Goals timeline events ───

interface MatchEvent {
  type: "goal" | "yellow" | "red";
  side: "home" | "away";
  playerName: string;
  minute: number | null;
  is_penalty?: boolean;
}

function buildMatchEvents(match: MatchData): MatchEvent[] {
  const events: MatchEvent[] = [];

  // Dolany scorers (structured)
  for (const s of match.scorers) {
    for (let i = 0; i < s.goals; i++) {
      events.push({
        type: "goal",
        side: match.is_home ? "home" : "away",
        playerName: s.playerName,
        minute: s.minute,
        is_penalty: s.is_penalty,
      });
    }
  }

  // Dolany cards (structured)
  for (const c of match.cards) {
    events.push({
      type: c.card_type,
      side: match.is_home ? "home" : "away",
      playerName: c.playerName,
      minute: c.minute,
    });
  }

  // Opponent scorers (structured table)
  for (const s of match.opponentScorers) {
    events.push({
      type: "goal",
      side: match.is_home ? "away" : "home",
      playerName: s.name,
      minute: s.minute,
      is_penalty: s.is_penalty,
    });
  }

  // Opponent cards (structured table)
  for (const c of match.opponentCards) {
    events.push({
      type: c.card_type,
      side: match.is_home ? "away" : "home",
      playerName: c.name,
      minute: c.minute,
    });
  }

  // Fallback: opponent_scorers free text (if no structured data)
  if (match.opponentScorers.length === 0 && match.opponent_scorers) {
    const parts = match.opponent_scorers.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const numMatch = part.match(/^(.+?)\s+(\d+)$/);
      const name = numMatch ? numMatch[1] : part;
      const count = numMatch ? parseInt(numMatch[2]) : 1;
      for (let i = 0; i < count; i++) {
        events.push({ type: "goal", side: match.is_home ? "away" : "home", playerName: name, minute: null });
      }
    }
  }

  if (match.opponentCards.length === 0 && match.opponent_cards) {
    const parts = match.opponent_cards.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      events.push({ type: "yellow", side: match.is_home ? "away" : "home", playerName: part, minute: null });
    }
  }

  events.sort((a, b) => {
    if (a.minute == null && b.minute == null) return 0;
    if (a.minute == null) return 1;
    if (b.minute == null) return -1;
    return a.minute - b.minute;
  });

  return events;
}

function addRunningScores(events: MatchEvent[], startHome = 0, startAway = 0) {
  let h = startHome;
  let a = startAway;
  return events.map((e) => {
    if (e.type === "goal") {
      if (e.side === "home") h++;
      else a++;
    }
    return { ...e, runningHome: h, runningAway: a };
  });
}

// ─── Match Score Header (Livesport style) ───

function MatchScoreHeader({ match }: { match: MatchData }) {
  const home = match.is_home ? "TJ Dolany" : match.opponent;
  const away = match.is_home ? match.opponent : "TJ Dolany";
  const oppLogo = getTeamLogo(match.opponent);
  const homeLogo = match.is_home ? DOLANY_LOGO : oppLogo;
  const awayLogo = match.is_home ? oppLogo : DOLANY_LOGO;
  const hasHalftime = match.halftime_home != null && match.halftime_away != null;

  const allEvents = buildMatchEvents(match);
  const goalEvents = allEvents.filter((e) => e.type === "goal");
  const cardEvents = allEvents.filter((e) => e.type !== "goal");
  const firstHalfGoals = hasHalftime ? goalEvents.filter((e) => e.minute != null && e.minute <= 45) : [];
  const secondHalfGoals = hasHalftime ? goalEvents.filter((e) => e.minute != null && e.minute > 45) : [];
  const noMinuteGoals = goalEvents.filter((e) => e.minute == null);

  // Dolany lineup
  const dolanyStarters = match.lineups.filter((l) => l.is_starter);
  const dolanySubs = match.lineups.filter((l) => !l.is_starter);

  // Opponent lineup
  const oppStarters = match.opponentLineup.filter((l) => l.is_starter);
  const oppSubs = match.opponentLineup.filter((l) => !l.is_starter);

  // Header info line
  const headerParts: string[] = [];
  if (match.round) headerParts.push(match.round);
  if (match.competition) headerParts.push(match.competition);

  const renderEventRow = (e: MatchEvent & { runningHome: number; runningAway: number }, idx: number) => {
    const minuteStr = e.minute != null ? `${e.minute}'` : "";
    const isHome = e.side === "home";

    if (e.type === "goal") {
      const scoreStr = `${e.runningHome}:${e.runningAway}`;
      const penaltyStr = e.is_penalty ? " (PK)" : "";
      if (isHome) {
        return (
          <div key={`g-${idx}`} className="flex items-center gap-2 py-1.5">
            <span className="w-8 text-right text-xs text-text-muted tabular-nums">{minuteStr}</span>
            <BallIcon className="w-4 h-4 text-text shrink-0" />
            <span className="text-xs font-bold text-brand-red tabular-nums">{scoreStr}</span>
            <span className="text-sm text-text font-medium">{e.playerName}{penaltyStr}</span>
          </div>
        );
      }
      return (
        <div key={`g-${idx}`} className="flex items-center gap-2 py-1.5 justify-end">
          <span className="text-sm text-text font-medium">{e.playerName}{penaltyStr}</span>
          <span className="text-xs font-bold text-blue-500 tabular-nums">{scoreStr}</span>
          <BallIcon className="w-4 h-4 text-text shrink-0" />
          <span className="w-8 text-left text-xs text-text-muted tabular-nums">{minuteStr}</span>
        </div>
      );
    }

    const cardIcon = e.type === "yellow"
      ? <YellowCard className="w-4 h-4 shrink-0" />
      : <RedCard className="w-4 h-4 shrink-0" />;

    if (isHome) {
      return (
        <div key={`c-${idx}`} className="flex items-center gap-2 py-1.5">
          <span className="w-8 text-right text-xs text-text-muted tabular-nums">{minuteStr}</span>
          {cardIcon}
          <span className="text-sm text-text">{e.playerName}</span>
        </div>
      );
    }
    return (
      <div key={`c-${idx}`} className="flex items-center gap-2 py-1.5 justify-end">
        <span className="text-sm text-text">{e.playerName}</span>
        {cardIcon}
        <span className="w-8 text-left text-xs text-text-muted tabular-nums">{minuteStr}</span>
      </div>
    );
  };

  const renderHalfGoals = (goals: MatchEvent[], startH = 0, startA = 0) => {
    const withScore = addRunningScores(goals, startH, startA);
    const homeEvts = withScore.filter((e) => e.side === "home");
    const awayEvts = withScore.filter((e) => e.side === "away");

    return (
      <div className="grid grid-cols-2 gap-x-4 py-2">
        <div>{homeEvts.map((e, i) => renderEventRow(e, i))}</div>
        <div>{awayEvts.map((e, i) => renderEventRow(e, i + 100))}</div>
      </div>
    );
  };

  // Card events split by half
  const firstHalfCards = hasHalftime ? cardEvents.filter((e) => e.minute != null && e.minute <= 45) : [];
  const secondHalfCards = hasHalftime ? cardEvents.filter((e) => e.minute != null && e.minute > 45) : [];
  const noMinuteCards = cardEvents.filter((e) => e.minute == null);

  const renderHalfCards = (evts: MatchEvent[]) => {
    if (evts.length === 0) return null;
    // Cards don't have running score — use dummy
    const withDummy = evts.map((e) => ({ ...e, runningHome: 0, runningAway: 0 }));
    const homeEvts = withDummy.filter((e) => e.side === "home");
    const awayEvts = withDummy.filter((e) => e.side === "away");
    return (
      <div className="grid grid-cols-2 gap-x-4">
        <div>{homeEvts.map((e, i) => renderEventRow(e, i + 200))}</div>
        <div>{awayEvts.map((e, i) => renderEventRow(e, i + 300))}</div>
      </div>
    );
  };

  // Lineup row component
  const LineupRow = ({ name, number, isCaptain, className }: { name: string; number: number | null; isCaptain: boolean; className?: string }) => (
    <div className={`flex items-center gap-2 py-1 text-sm ${className || ""}`}>
      {number != null && <span className="w-6 text-right text-xs text-text-muted tabular-nums">{number}</span>}
      <span className="text-text">{name}{isCaptain ? " [K]" : ""}</span>
    </div>
  );

  // Footer info
  const footerParts: string[] = [];
  if (match.match_number) footerParts.push(`Cislo utkani: ${match.match_number}`);
  if (match.referee) footerParts.push(`Rozhodci: ${match.referee}`);
  if (match.delegate) footerParts.push(`Delegat: ${match.delegate}`);
  if (match.venue) footerParts.push(`Hriste: ${match.venue}`);
  if (match.spectators != null) footerParts.push(`Divaku: ${match.spectators}`);

  return (
    <div className="rounded-xl bg-surface-muted border border-border overflow-hidden mb-8">
      {/* Date + time + round + competition */}
      <div className="text-center pt-5 pb-2">
        <span className="text-xs text-text-muted">
          {formatMatchDate(match.date)}
          {headerParts.length > 0 && `, ${headerParts.join(", ")}`}
        </span>
      </div>

      {/* Logo - Score - Logo */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 px-4 pb-2">
        <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
          <span className="text-sm sm:text-base font-bold text-text text-right truncate">{home}</span>
          {homeLogo ? (
            <Image src={homeLogo} alt={home} width={48} height={48} className="rounded-full object-cover ring-1 ring-border shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-surface ring-1 ring-border shrink-0" />
          )}
        </div>
        <div className="flex flex-col items-center shrink-0">
          <span className="text-3xl sm:text-4xl font-extrabold text-text tabular-nums tracking-tight">
            {match.score_home}<span className="text-text-muted mx-1">-</span>{match.score_away}
          </span>
          {hasHalftime && (
            <span className="text-[10px] text-text-muted tabular-nums">({match.halftime_home}:{match.halftime_away})</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {awayLogo ? (
            <Image src={awayLogo} alt={away} width={48} height={48} className="rounded-full object-cover ring-1 ring-border shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-surface ring-1 ring-border shrink-0" />
          )}
          <span className="text-sm sm:text-base font-bold text-text truncate">{away}</span>
        </div>
      </div>

      {/* KONEC */}
      <div className="text-center pb-4">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Konec</span>
      </div>

      <div className="h-px bg-border" />

      {/* Goals timeline */}
      {goalEvents.length > 0 && (
        <div className="px-4 py-3">
          {hasHalftime ? (
            <>
              <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-1 mb-1">
                <span>1. polocas</span>
                <span className="tabular-nums">{match.halftime_home}:{match.halftime_away}</span>
              </div>
              {firstHalfGoals.length > 0 ? renderHalfGoals(firstHalfGoals) : (
                <p className="text-xs text-text-muted py-2 text-center">Bez golu</p>
              )}
              {renderHalfCards(firstHalfCards)}

              <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-1 mb-1 mt-3">
                <span>2. polocas</span>
                <span className="tabular-nums">{match.score_home - (match.halftime_home ?? 0)}:{match.score_away - (match.halftime_away ?? 0)}</span>
              </div>
              {secondHalfGoals.length > 0 ? renderHalfGoals(secondHalfGoals, match.halftime_home ?? 0, match.halftime_away ?? 0) : (
                <p className="text-xs text-text-muted py-2 text-center">Bez golu</p>
              )}
              {renderHalfCards(secondHalfCards)}

              {noMinuteGoals.length > 0 && renderHalfGoals(noMinuteGoals, match.score_home, match.score_away)}
              {renderHalfCards(noMinuteCards)}
            </>
          ) : (
            renderHalfGoals(goalEvents)
          )}
        </div>
      )}

      {/* Cards without goals (if no goals section rendered them) */}
      {goalEvents.length === 0 && cardEvents.length > 0 && (
        <div className="px-4 py-3">
          {renderHalfCards(cardEvents)}
        </div>
      )}

      {/* Lineups */}
      {(dolanyStarters.length > 0 || oppStarters.length > 0) && (
        <>
          <div className="h-px bg-border" />
          <div className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Home team lineup */}
              <div>
                <h3 className="text-sm font-bold text-text mb-2">
                  {match.is_home ? "TJ Dolany" : match.opponent}
                </h3>
                {(match.is_home ? dolanyStarters : oppStarters).length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Zakladni sestava</p>
                    {(match.is_home ? dolanyStarters : oppStarters).map((p) => (
                      <LineupRow
                        key={"name" in p ? p.name : p.playerName}
                        name={"name" in p ? p.name : p.playerName}
                        number={p.number}
                        isCaptain={p.is_captain}
                      />
                    ))}
                  </>
                )}
                {(match.is_home ? dolanySubs : oppSubs).length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-3 mb-1">Nahradnici</p>
                    {(match.is_home ? dolanySubs : oppSubs).map((p) => (
                      <LineupRow
                        key={"name" in p ? p.name : p.playerName}
                        name={"name" in p ? p.name : p.playerName}
                        number={p.number}
                        isCaptain={p.is_captain}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Away team lineup */}
              <div>
                <h3 className="text-sm font-bold text-text mb-2">
                  {match.is_home ? match.opponent : "TJ Dolany"}
                </h3>
                {(match.is_home ? oppStarters : dolanyStarters).length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Zakladni sestava</p>
                    {(match.is_home ? oppStarters : dolanyStarters).map((p) => (
                      <LineupRow
                        key={"name" in p ? p.name : p.playerName}
                        name={"name" in p ? p.name : p.playerName}
                        number={p.number}
                        isCaptain={p.is_captain}
                      />
                    ))}
                  </>
                )}
                {(match.is_home ? oppSubs : dolanySubs).length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-3 mb-1">Nahradnici</p>
                    {(match.is_home ? oppSubs : dolanySubs).map((p) => (
                      <LineupRow
                        key={"name" in p ? p.name : p.playerName}
                        name={"name" in p ? p.name : p.playerName}
                        number={p.number}
                        isCaptain={p.is_captain}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer: referee, delegate, venue, spectators */}
      {footerParts.length > 0 && (
        <>
          <div className="h-px bg-border" />
          <div className="px-4 py-3">
            <p className="text-xs text-text-muted leading-relaxed">
              {footerParts.join(". ")}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function ArticleDetail({ article, matchData }: { article: Article; matchData?: MatchData | null }) {
  const rawHtml = marked.parse(article.content) as string;
  const html = renderContentWithVideo(rawHtml);
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
          Zpet na aktuality
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-brand-red uppercase tracking-wider">
            {CATEGORIES.find((c) => c.value === article.category)?.label}
          </span>
          <span className="text-xs text-text-muted">{formatDateCzech(article.created_at)}</span>
        </div>

        {matchData ? (
          <>
            <MatchScoreHeader match={matchData} />

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
          </>
        ) : (
          <>
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
          </>
        )}

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
