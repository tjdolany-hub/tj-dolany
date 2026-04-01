"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import PlayerCard from "@/components/public/PlayerCard";
import AnimatedSection, { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import { formatDateShort, POSITION_LABELS } from "@/lib/utils";
import type { Database } from "@/types/database";

type Player = Database["public"]["Tables"]["players"]["Row"];
type Draw = Database["public"]["Tables"]["season_draws"]["Row"];
type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

const POSITION_ORDER = ["brankar", "obrance", "zaloznik", "utocnik"];

export default function TymClient({
  players,
  draws,
  matches,
}: {
  players: Player[];
  draws: Draw[];
  matches: MatchResult[];
}) {
  const grouped = POSITION_ORDER.map((pos) => ({
    position: pos,
    label: POSITION_LABELS[pos] ? POSITION_LABELS[pos].replace(/ář$/, "áři").replace(/ce$/, "ci").replace(/ík$/, "íci") : pos,
    players: players.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0);

  // Fix plural labels
  const PLURAL_LABELS: Record<string, string> = {
    brankar: "Brankáři",
    obrance: "Obránci",
    zaloznik: "Záložníci",
    utocnik: "Útočníci",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2">Náš tým</p>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">
          Tým
        </h1>
      </motion.div>

      {/* Squad */}
      <section className="mb-16">
        <AnimatedSection>
          <h2 className="text-3xl font-bold text-text tracking-tight mb-10 text-center">
            Kádr mužstva
          </h2>
        </AnimatedSection>

        {grouped.map((group) => (
          <AnimatedSection key={group.position} className="mb-12">
            <h3 className="text-xl font-bold text-brand-red mb-6 flex items-center gap-3">
              <span className="w-8 h-0.5 bg-brand-red rounded-full" />
              {PLURAL_LABELS[group.position] || group.label}
            </h3>
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {group.players.map((player) => (
                <StaggerItem key={player.id}>
                  <PlayerCard
                    name={player.name}
                    position={player.position}
                    number={player.number}
                    photo={player.photo}
                    description={player.description}
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

      {/* Match results */}
      {matches.length > 0 && (
        <AnimatedSection className="mb-16">
          <section>
            <h2 className="text-3xl font-bold text-text tracking-tight mb-10 text-center">
              Výsledky zápasů
            </h2>
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted">
                      <th className="text-left px-4 py-3 font-semibold text-text-muted">Datum</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-muted">Soupeř</th>
                      <th className="text-center px-4 py-3 font-semibold text-text-muted">Skóre</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-muted hidden md:table-cell">Soutěž</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => {
                      const isWin = match.is_home
                        ? match.score_home > match.score_away
                        : match.score_away > match.score_home;
                      const isDraw = match.score_home === match.score_away;
                      return (
                        <tr key={match.id} className="border-b border-border last:border-0 hover:bg-surface-muted transition-colors">
                          <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                            {formatDateShort(match.date)}
                          </td>
                          <td className="px-4 py-3 text-text font-medium">
                            {match.is_home ? "TJ Dolany" : match.opponent}
                            {" vs. "}
                            {match.is_home ? match.opponent : "TJ Dolany"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                              isWin ? "bg-green-100 text-green-700" :
                              isDraw ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {match.score_home}:{match.score_away}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                            {match.competition || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </AnimatedSection>
      )}

      {/* Season draws */}
      {draws.length > 0 && (
        <AnimatedSection>
          <section>
            <h2 className="text-3xl font-bold text-text tracking-tight mb-10 text-center">
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
      )}
    </div>
  );
}
