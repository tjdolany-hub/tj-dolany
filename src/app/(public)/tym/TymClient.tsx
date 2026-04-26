"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import dynamic from "next/dynamic";
import PlayerCard from "@/components/public/PlayerCard";
import AnimatedSection, { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import { POSITION_LABELS } from "@/lib/utils";
import type { TeamEntry } from "@/lib/team-logos";
import type { Database } from "@/types/database";
import type { MatchEvent } from "./MatchResultsSection";
import type { StatsEntry } from "./PlayerStatistics";
import type { LeagueStanding } from "./LeagueTable";

const MatchResultsSection = dynamic(() => import("./MatchResultsSection"));
const PlayerStatisticsSection = dynamic(() => import("./PlayerStatistics"));
const LeagueTableSection = dynamic(() => import("./LeagueTable"));

type Player = Database["public"]["Tables"]["players"]["Row"];
type Draw = Database["public"]["Tables"]["season_draws"]["Row"];
type MatchResult = Database["public"]["Tables"]["match_results"]["Row"] & {
  articles?: { slug: string } | null;
  match_images?: { url: string; alt: string | null; sort_order: number }[];
};

type PlayerStats = Record<string, { matches: number; goals: number; yellows: number; reds: number }>;

const POSITION_ORDER = ["brankar", "obrance", "zaloznik", "utocnik", "trener"];

export default function TymClient({
  players,
  draws,
  matches,
  playerStats,
  standings,
  statsEntries,
  availableSeasons,
  matchEvents,
  trainingLeaderboard = [],
  teams,
}: {
  players: Player[];
  draws: Draw[];
  matches: MatchResult[];
  playerStats?: PlayerStats;
  standings?: LeagueStanding[];
  statsEntries?: StatsEntry[];
  availableSeasons?: string[];
  matchEvents?: Record<string, MatchEvent[]>;
  trainingLeaderboard?: { player_id: string; jde: number; nejde: number; neodpovedel: number; total: number; rate: number }[];
  teams?: TeamEntry[];
}) {
  const grouped = POSITION_ORDER.map((pos) => ({
    position: pos,
    label: POSITION_LABELS[pos] ? POSITION_LABELS[pos].replace(/ář$/, "áři").replace(/ce$/, "ci").replace(/ík$/, "íci") : pos,
    players: players.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0);

  const PLURAL_LABELS: Record<string, string> = {
    brankar: "Brankáři",
    obrance: "Obránci",
    zaloznik: "Záložníci",
    utocnik: "Útočníci",
    trener: "Realizační tým",
  };

  const sections = [
    { id: "soupiska", label: "Soupiska" },
    ...(matches.length > 0 ? [{ id: "vysledky", label: "Zápasy" }] : []),
    ...(standings && standings.length > 0 ? [{ id: "tabulka", label: "Tabulka" }] : []),
    ...(statsEntries && statsEntries.length > 0 ? [{ id: "statistiky", label: "Statistiky" }] : []),
    ...(trainingLeaderboard.length > 0 ? [{ id: "dochazka", label: "Docházka" }] : []),
    ...(draws.length > 0 ? [{ id: "los", label: "Los" }] : []),
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2 flex items-center justify-center gap-2"><span className="w-1 h-5 bg-brand-red rounded-full" />Náš tým</p>
          <h1 className="text-4xl font-extrabold text-text tracking-tight">
            Tým a statistiky
          </h1>
        </motion.div>
      </div>

      {/* Section navigation — sticky */}
      <div className="sticky top-16 z-30 bg-surface-muted/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap justify-center gap-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
      </div>

      {/* Squad */}
      <div className="bg-surface py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section id="soupiska" className="scroll-mt-28">
        <AnimatedSection>
          <h2 className="text-2xl font-bold text-text tracking-tight mb-10 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Soupiska týmu
          </h2>
        </AnimatedSection>

        {grouped.map((group) => (
          <AnimatedSection key={group.position} className="mb-12">
            <h3 className="text-lg font-bold text-text mb-6 flex items-center justify-center gap-3">
              <span className="w-6 h-0.5 bg-brand-red rounded-full" />
              {PLURAL_LABELS[group.position] || group.label}
            </h3>
            <StaggerContainer className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {group.players.map((player) => (
                <StaggerItem key={player.id}>
                  <PlayerCard
                    id={player.id}
                    name={player.name}
                    first_name={player.first_name}
                    last_name={player.last_name}
                    nickname={player.nickname}
                    birth_date={player.birth_date}
                    position={player.position}
                    number={player.number}
                    photo={player.photo}
                    description={player.description}
                    stats={playerStats?.[player.id] ?? null}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </AnimatedSection>
        ))}

        {players.length === 0 && (
          <p className="text-center text-text-muted py-12 text-lg">
            Kádr zatím není vyplněn.
          </p>
        )}
      </section>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Match results */}
      {matches.length > 0 && (
        <div className="bg-surface-alt py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="vysledky" className="scroll-mt-28">
          <MatchResultsSection matches={matches} matchEvents={matchEvents} teams={teams} />
        </div>
        </div>
        </div>
      )}

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* League table */}
      {standings && standings.length > 0 && (
        <div className="bg-surface py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="tabulka" className="scroll-mt-28">
          <AnimatedSection>
            <LeagueTableSection standings={standings} />
          </AnimatedSection>
        </div>
        </div>
        </div>
      )}

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Player statistics */}
      {statsEntries && statsEntries.length > 0 && availableSeasons && availableSeasons.length > 0 && (
        <div className="bg-surface-alt py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="statistiky" className="scroll-mt-28">
          <AnimatedSection>
            <PlayerStatisticsSection players={players} entries={statsEntries} seasons={availableSeasons} />
          </AnimatedSection>
        </div>
        </div>
        </div>
      )}

      {/* Training attendance leaderboard */}
      {trainingLeaderboard.length > 0 && (
        <>
        <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
        <div className="bg-surface py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="dochazka" className="scroll-mt-28">
          <AnimatedSection>
            <h2 className="text-2xl font-bold text-text tracking-tight mb-6 flex items-center justify-center gap-3">
              <span className="w-8 h-0.5 bg-brand-red rounded-full" />
              Docházka na tréninky
            </h2>
            <div className="bg-surface-alt rounded-xl border border-border overflow-hidden max-w-2xl mx-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="px-3 py-3 text-center font-semibold text-text-muted w-10">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-muted">Hráč</th>
                    <th className="px-3 py-3 text-center font-semibold text-green-500" title="Jde">✓</th>
                    <th className="px-3 py-3 text-center font-semibold text-red-500" title="Nejde">✗</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-400" title="Neodpověděl">?</th>
                    <th className="px-3 py-3 text-center font-semibold text-text-muted">Účast</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingLeaderboard.slice(0, 6).map((s, i) => {
                    const name = players.find((p) => p.id === s.player_id)?.name ?? "?";
                    return (
                      <tr key={s.player_id} className={`border-b border-border last:border-0 ${i < 3 ? "bg-brand-red/5" : ""}`}>
                        <td className="px-3 py-2.5 text-center font-bold text-text-muted text-xs">{i + 1}.</td>
                        <td className="px-4 py-2.5 font-medium text-text">{name}</td>
                        <td className="px-3 py-2.5 text-center text-green-500 font-semibold">{s.jde}</td>
                        <td className="px-3 py-2.5 text-center text-red-500 font-semibold">{s.nejde}</td>
                        <td className="px-3 py-2.5 text-center text-gray-400">{s.neodpovedel}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-bold ${s.rate >= 70 ? "text-green-500" : s.rate >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                            {s.rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        </div>
        </div>
        </div>
        </>
      )}

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Season draws */}
      {draws.length > 0 && (
        <div className="bg-surface py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <section id="los" className="scroll-mt-28">
            <h2 className="text-2xl font-bold text-text tracking-tight mb-10 flex items-center justify-center gap-3">
              <span className="w-8 h-0.5 bg-brand-red rounded-full" />
              Los soutěže
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {draws.map((draw) => (
                <motion.div
                  key={draw.id}
                  whileHover={{ y: -4 }}
                  className="bg-surface rounded-xl border border-border p-5 card-hover"
                >
                  <h3 className="font-bold text-text text-lg mb-4 text-center tracking-tight">
                    {draw.title}
                  </h3>
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                    <Image
                      src={draw.image}
                      alt={draw.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </AnimatedSection>
        </div>
        </div>
      )}

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
    </div>
  );
}
