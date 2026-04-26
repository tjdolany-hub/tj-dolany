"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import MatchGallery from "@/components/public/MatchGallery";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { BallIcon, YellowCard, RedCard } from "@/components/ui/StatIcons";
import { formatDateShort, formatTimePrague, isMidnightPrague } from "@/lib/utils";
import { getTeamLogo, DOLANY_LOGO, type TeamEntry } from "@/lib/team-logos";
import type { Database } from "@/types/database";

type MatchResult = Database["public"]["Tables"]["match_results"]["Row"] & {
  articles?: { slug: string } | null;
  match_images?: { url: string; alt: string | null; sort_order: number }[];
};

export type MatchEvent = {
  type: "goal" | "yellow" | "red";
  minute: number | null;
  playerName: string;
  is_penalty: boolean;
  side: "home" | "away";
};

function getSeasonForDate(d: Date): string {
  const year = d.getFullYear();
  const month = d.getMonth();
  if (month >= 7) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function getHalfForDate(d: Date): "podzim" | "jaro" {
  return d.getMonth() >= 7 ? "podzim" : "jaro";
}

function formatMatchTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isMidnightPrague(d)) return "";
  return formatTimePrague(d);
}

function MatchTimeline({ match, events, teams }: { match: MatchResult; events: MatchEvent[]; teams?: TeamEntry[] }) {
  const router = useRouter();
  const hasArticle = !!match.articles?.slug;
  const matchImages = (match.match_images ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({ url: img.url, alt: img.alt }));
  const home = match.is_home ? "TJ Dolany" : match.opponent;
  const away = match.is_home ? match.opponent : "TJ Dolany";
  const matchTitleStr = `${home} vs ${away}`;

  const sorted = [...events].sort((a, b) => {
    if (a.minute == null && b.minute == null) return 0;
    if (a.minute == null) return 1;
    if (b.minute == null) return -1;
    return a.minute - b.minute;
  });

  const hasHalftime = match.halftime_home != null && match.halftime_away != null;
  const firstHalf = hasHalftime ? sorted.filter((e) => e.minute != null && e.minute <= 45) : [];
  const secondHalf = hasHalftime ? sorted.filter((e) => e.minute != null && e.minute > 45) : [];
  const noMinute = sorted.filter((e) => e.minute == null);

  function addRunningScore(evts: MatchEvent[]) {
    let homeScore = 0;
    let awayScore = 0;
    if (hasHalftime && evts === secondHalf) {
      homeScore = match.halftime_home!;
      awayScore = match.halftime_away!;
    }
    return evts.map((e) => {
      if (e.type === "goal") {
        if (e.side === "home") homeScore++;
        else awayScore++;
      }
      return { ...e, runningHome: homeScore, runningAway: awayScore };
    });
  }

  const renderEvent = (e: MatchEvent & { runningHome: number; runningAway: number }) => {
    const isHome = e.side === "home";
    const minuteStr = e.minute != null ? `${e.minute}'` : "";

    if (e.type === "goal") {
      const scoreStr = `${e.runningHome}:${e.runningAway}`;
      const penaltyStr = e.is_penalty ? " (PK)" : "";
      if (isHome) {
        return (
          <div key={`${e.minute}-${e.playerName}-${e.side}`} className="flex items-center gap-2 py-1">
            <span className="w-10 text-right text-xs text-text-muted tabular-nums">{minuteStr}</span>
            <BallIcon className="w-4 h-4 text-text shrink-0" />
            <span className="text-xs font-bold text-brand-red tabular-nums">{scoreStr}</span>
            <span className="text-sm text-text font-medium">{e.playerName}{penaltyStr}</span>
          </div>
        );
      } else {
        return (
          <div key={`${e.minute}-${e.playerName}-${e.side}`} className="flex items-center gap-2 py-1 justify-end">
            <span className="text-sm text-text font-medium">{e.playerName}{penaltyStr}</span>
            <span className="text-xs font-bold text-blue-500 tabular-nums">{scoreStr}</span>
            <BallIcon className="w-4 h-4 text-text shrink-0" />
            <span className="w-10 text-left text-xs text-text-muted tabular-nums">{minuteStr}</span>
          </div>
        );
      }
    }

    const cardIcon = e.type === "yellow"
      ? <YellowCard className="w-4 h-4 shrink-0" />
      : <RedCard className="w-4 h-4 shrink-0" />;

    if (isHome) {
      return (
        <div key={`${e.minute}-${e.playerName}-${e.side}-${e.type}`} className="flex items-center gap-2 py-1">
          <span className="w-10 text-right text-xs text-text-muted tabular-nums">{minuteStr}</span>
          {cardIcon}
          <span className="text-sm text-text">{e.playerName}</span>
        </div>
      );
    } else {
      return (
        <div key={`${e.minute}-${e.playerName}-${e.side}-${e.type}`} className="flex items-center gap-2 py-1 justify-end">
          <span className="text-sm text-text">{e.playerName}</span>
          {cardIcon}
          <span className="w-10 text-left text-xs text-text-muted tabular-nums">{minuteStr}</span>
        </div>
      );
    }
  };

  const renderHalfEvents = (evts: MatchEvent[]) => {
    const withScore = addRunningScore(evts);
    const homeEvents = withScore.filter((e) => e.side === "home");
    const awayEvents = withScore.filter((e) => e.side === "away");

    return (
      <div className="grid grid-cols-2 gap-x-4 py-2">
        <div>{homeEvents.map(renderEvent)}</div>
        <div>{awayEvents.map(renderEvent)}</div>
      </div>
    );
  };

  const oppLogo = getTeamLogo(match.opponent, teams);
  const homeLogo = match.is_home ? DOLANY_LOGO : oppLogo;
  const awayLogo = match.is_home ? oppLogo : DOLANY_LOGO;

  const matchHeader = (
    <div className="flex items-center justify-center gap-3 sm:gap-5 py-3 border-b border-border">
      <div className="flex flex-col items-center flex-1 min-w-0">
        {homeLogo ? (
          <Image src={homeLogo} alt={home} width={36} height={36} className="object-contain drop-shadow-md mb-1" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-surface-muted ring-1 ring-border mb-1" />
        )}
        <span className="text-xs sm:text-sm font-bold text-text text-center truncate max-w-full">{home}</span>
      </div>
      <div className="flex flex-col items-center shrink-0">
        <span className="text-xl sm:text-2xl font-extrabold text-text tabular-nums">{match.score_home}:{match.score_away}</span>
        {hasHalftime && (
          <span className="text-[10px] text-text-muted tabular-nums">({match.halftime_home}:{match.halftime_away})</span>
        )}
      </div>
      <div className="flex flex-col items-center flex-1 min-w-0">
        {awayLogo ? (
          <Image src={awayLogo} alt={away} width={36} height={36} className="object-contain drop-shadow-md mb-1" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-surface-muted ring-1 ring-border mb-1" />
        )}
        <span className="text-xs sm:text-sm font-bold text-text text-center truncate max-w-full">{away}</span>
      </div>
    </div>
  );

  const articleLink = hasArticle && (
    <div className="mt-2 pt-2 border-t border-border">
      <button onClick={() => router.push(`/aktuality/${match.articles!.slug}`)}
        className="text-xs text-brand-red hover:text-brand-red-dark font-medium">
        Zobrazit referát &rarr;
      </button>
    </div>
  );

  const gallery = matchImages.length > 0 && (
    <div className="mt-3 pt-3 border-t border-border">
      <MatchGallery photos={matchImages} matchTitle={matchTitleStr} />
    </div>
  );

  if (hasHalftime) {
    const secondHalfHomeGoals = match.score_home - match.halftime_home!;
    const secondHalfAwayGoals = match.score_away - match.halftime_away!;
    return (
      <div className="px-4 py-3 bg-surface-muted/50">
        {matchHeader}
        <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-1 mb-1">
          <span>1. poločas</span>
          <span className="tabular-nums">{match.halftime_home}:{match.halftime_away}</span>
        </div>
        {firstHalf.length > 0 ? renderHalfEvents(firstHalf) : (
          <p className="text-xs text-text-muted py-2 text-center">Bez událostí</p>
        )}
        <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-1 mb-1 mt-3">
          <span>2. poločas</span>
          <span className="tabular-nums">{secondHalfHomeGoals}:{secondHalfAwayGoals}</span>
        </div>
        {secondHalf.length > 0 ? renderHalfEvents(secondHalf) : (
          <p className="text-xs text-text-muted py-2 text-center">Bez událostí</p>
        )}
        {noMinute.length > 0 && renderHalfEvents(noMinute)}
        {gallery}
        {articleLink}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-surface-muted/50">
      {matchHeader}
      {sorted.length > 0 ? renderHalfEvents(sorted) : (
        <p className="text-xs text-text-muted py-2 text-center">Bez detailních událostí</p>
      )}
      {gallery}
      {articleLink}
    </div>
  );
}

export default function MatchResultsSection({ matches, matchEvents, teams }: { matches: MatchResult[]; matchEvents?: Record<string, MatchEvent[]>; teams?: TeamEntry[] }) {
  const now = new Date();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultSeason = getSeasonForDate(nextMonth);
  const defaultHalf = getHalfForDate(nextMonth);

  const availableSeasons = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.season) set.add(m.season);
      else set.add(getSeasonForDate(new Date(m.date)));
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [matches]);

  const [selectedSeason, setSelectedSeason] = useState(
    availableSeasons.includes(defaultSeason) ? defaultSeason : availableSeasons[0] || ""
  );
  const [selectedHalf, setSelectedHalf] = useState<"podzim" | "jaro">(defaultHalf);

  const filteredMatches = useMemo(() => {
    return matches
      .filter((m) => {
        const season = m.season || getSeasonForDate(new Date(m.date));
        if (season !== selectedSeason) return false;
        const half = getHalfForDate(new Date(m.date));
        return half === selectedHalf;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [matches, selectedSeason, selectedHalf]);

  const isPlayed = (match: MatchResult) => new Date(match.date) <= now;

  return (
    <AnimatedSection>
      <section>
        <h2 className="text-2xl font-bold text-text tracking-tight mb-6 flex items-center justify-center gap-3">
          <span className="w-8 h-0.5 bg-brand-red rounded-full" />
          Zápasy — výsledky a program
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {availableSeasons.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSeason(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSeason === s
                  ? "bg-brand-red text-white"
                  : "bg-surface border border-border text-text-muted hover:text-text"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {(["podzim", "jaro"] as const).map((half) => (
            <button
              key={half}
              onClick={() => setSelectedHalf(half)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedHalf === half
                  ? "bg-brand-yellow text-brand-dark"
                  : "bg-surface border border-border text-text-muted hover:text-text"
              }`}
            >
              {half === "podzim" ? "Podzim" : "Jaro"}
            </button>
          ))}
        </div>

        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="text-center px-2 py-3 font-semibold text-text-muted w-10" title="Domácí / Venkovní">D/V</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Čas</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Datum</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Soupeř</th>
                  <th className="text-center px-4 py-3 font-semibold text-text-muted">Skóre</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted hidden md:table-cell">Soutěž</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((match) => {
                  const played = isPlayed(match);
                  const events = matchEvents?.[match.id] ?? [];
                  const hasImages = (match.match_images ?? []).length > 0;
                  const hasEvents = played && (events.length > 0 || hasImages);
                  const isExpanded = expandedId === match.id;
                  const isWin = played && (match.is_home
                    ? match.score_home > match.score_away
                    : match.score_away > match.score_home);
                  const isDraw = played && match.score_home === match.score_away;
                  const time = formatMatchTime(match.date);

                  return (
                    <tr key={match.id} className="border-b border-border last:border-0">
                      <td colSpan={6} className="p-0">
                        <div
                          onClick={hasEvents ? () => setExpandedId(isExpanded ? null : match.id) : undefined}
                          className={`flex items-center transition-colors ${
                            hasEvents ? "cursor-pointer" : ""
                          } ${match.is_home ? "bg-brand-red/5 hover:bg-brand-red/10" : "hover:bg-surface-muted"}`}
                        >
                          <div className="px-2 py-3 text-center w-10 shrink-0">
                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              match.is_home
                                ? "bg-brand-red/15 text-brand-red"
                                : "bg-surface-muted text-text-muted"
                            }`}>
                              {match.is_home ? "D" : "V"}
                            </span>
                          </div>
                          <div className="px-4 py-3 text-text-muted whitespace-nowrap tabular-nums w-16 shrink-0">
                            {time || "—"}
                          </div>
                          <div className="px-4 py-3 text-text-muted whitespace-nowrap w-24 shrink-0">
                            {formatDateShort(match.date)}
                          </div>
                          <div className="px-4 py-3 text-text font-medium flex-1 min-w-0 flex items-center gap-1.5">
                            {(() => {
                              const oLogo = getTeamLogo(match.opponent, teams);
                              const hLogo = match.is_home ? DOLANY_LOGO : oLogo;
                              const aLogo = match.is_home ? oLogo : DOLANY_LOGO;
                              return (
                                <>
                                  {hLogo && <Image src={hLogo} alt="" width={18} height={18} className="object-contain shrink-0" />}
                                  <span>{match.is_home ? "TJ Dolany" : match.opponent}</span>
                                  <span className="text-text-muted">–</span>
                                  <span>{match.is_home ? match.opponent : "TJ Dolany"}</span>
                                  {aLogo && <Image src={aLogo} alt="" width={18} height={18} className="object-contain shrink-0" />}
                                </>
                              );
                            })()}
                            {hasEvents && (
                              <span className={`ml-2 text-[10px] text-text-muted transition-transform inline-block ${isExpanded ? "rotate-180" : ""}`}>&#9660;</span>
                            )}
                          </div>
                          <div className="px-4 py-3 text-center w-20 shrink-0">
                            {played ? (
                              <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                                isWin ? "bg-green-100 text-green-700" :
                                isDraw ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {match.score_home}:{match.score_away}
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </div>
                          <div className="px-4 py-3 text-text-muted hidden md:block w-40 shrink-0">
                            {match.competition || "—"}
                          </div>
                        </div>
                        {isExpanded && hasEvents && (
                          <MatchTimeline match={match} events={events} teams={teams} />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredMatches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                      Žádné zápasy pro {selectedSeason} – {selectedHalf === "podzim" ? "podzim" : "jaro"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
