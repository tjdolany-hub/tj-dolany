"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { POSITION_COLORS, POSITION_LABELS, formatDateShort } from "@/lib/utils";
import type { Database } from "@/types/database";

type Player = Database["public"]["Tables"]["players"]["Row"];

interface SeasonStats {
  season: string;
  matches: number;
  goals: number;
  yellows: number;
  reds: number;
}

interface MatchEntry {
  id: string;
  date: string;
  opponent: string;
  score_home: number;
  score_away: number;
  is_home: boolean;
  season: string | null;
  competition: string | null;
  goals: number;
  yellows: number;
  reds: number;
  is_starter: boolean;
}

interface TrainingStat {
  season: string;
  jde: number;
  nejde: number;
  neodpovedel: number;
  total: number;
  rate: number;
}

function calcAge(birthDate: string): number {
  return Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

export default function PlayerDetailClient({
  player,
  seasonStats,
  matchHistory,
  totals,
  trainingStats = [],
  trainingTotals = { jde: 0, nejde: 0, neodpovedel: 0, total: 0 },
}: {
  player: Player;
  seasonStats: SeasonStats[];
  matchHistory: MatchEntry[];
  totals: { matches: number; goals: number; yellows: number; reds: number };
  trainingStats?: TrainingStat[];
  trainingTotals?: { jde: number; nejde: number; neodpovedel: number; total: number };
}) {
  const posColor = POSITION_COLORS[player.position] || "bg-gray-500 text-white";
  const posLabel = POSITION_LABELS[player.position] || player.position;
  const displayName =
    player.first_name || player.last_name
      ? `${player.first_name || ""} ${player.last_name || ""}`.trim()
      : player.name;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/tym"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-brand-red transition-colors mb-8"
      >
        <ArrowLeft size={16} /> Zpět na tým
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-6 items-start mb-12"
      >
        <div className="relative w-40 h-40 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-brand-dark to-brand-dark-light">
          {player.photo ? (
            <Image
              src={player.photo}
              alt={displayName}
              fill
              className="object-cover"
              sizes="160px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white/30"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
          {player.number && (
            <div className="absolute top-2 right-2 bg-brand-dark/80 backdrop-blur-sm text-brand-yellow font-bold w-8 h-8 flex items-center justify-center rounded-full border border-brand-yellow/30">
              {player.number}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">
            {displayName}
          </h1>
          {player.nickname && (
            <p className="text-lg text-text-muted">&quot;{player.nickname}&quot;</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${posColor}`}>
              {posLabel}
            </span>
            {player.birth_date && (
              <span className="text-sm text-text-muted">
                {calcAge(player.birth_date)} let
              </span>
            )}
          </div>
          {player.description && (
            <p className="text-sm text-text-muted mt-3">{player.description}</p>
          )}
        </div>
      </motion.div>

      {/* Overall totals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
      >
        {[
          { label: "Zápasy", value: totals.matches, color: "text-brand-red" },
          { label: "Góly", value: totals.goals, color: "text-brand-red" },
          { label: "Žluté karty", value: totals.yellows, color: "text-yellow-600" },
          { label: "Červené karty", value: totals.reds, color: "text-red-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface rounded-xl border border-border p-4 text-center"
          >
            <p className="text-2xl font-extrabold tracking-tight">
              <span className={stat.color}>{stat.value}</span>
            </p>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Training attendance stats */}
      {trainingTotals.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
            <ClipboardList size={20} className="text-brand-red" /> Docházka na tréninky
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-extrabold tracking-tight text-green-500">{trainingTotals.jde}</p>
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mt-1">Jde</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-extrabold tracking-tight text-red-500">{trainingTotals.nejde}</p>
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mt-1">Nejde</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-extrabold tracking-tight text-gray-400">{trainingTotals.neodpovedel}</p>
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mt-1">Neodpověděl</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-extrabold tracking-tight text-brand-yellow">
                {trainingTotals.total > 0 ? Math.round((trainingTotals.jde / trainingTotals.total) * 100) : 0}%
              </p>
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mt-1">Účast</p>
            </div>
          </div>
          {trainingStats.length > 1 && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="text-left px-4 py-3 font-semibold text-text-muted">Sezóna</th>
                    <th className="text-center px-4 py-3 font-semibold text-text-muted">Jde</th>
                    <th className="text-center px-4 py-3 font-semibold text-text-muted">Nejde</th>
                    <th className="text-center px-4 py-3 font-semibold text-text-muted">Neodp.</th>
                    <th className="text-center px-4 py-3 font-semibold text-text-muted">Účast</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingStats.map((t) => (
                    <tr key={t.season} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-text">{t.season}</td>
                      <td className="px-4 py-3 text-center text-green-500 font-bold">{t.jde}</td>
                      <td className="px-4 py-3 text-center text-red-500 font-bold">{t.nejde}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{t.neodpovedel}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${t.rate >= 70 ? "text-green-500" : t.rate >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                          {t.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Season stats table */}
      {seasonStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-text mb-4">Statistiky podle sezón</h2>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">
                    Sezóna
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-text-muted">
                    Zápasy
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-text-muted">
                    Góly
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-text-muted">
                    ŽK
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-text-muted">
                    ČK
                  </th>
                </tr>
              </thead>
              <tbody>
                {seasonStats.map((s) => (
                  <tr key={s.season} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{s.season}</td>
                    <td className="px-4 py-3 text-center text-text">{s.matches}</td>
                    <td className="px-4 py-3 text-center text-text font-bold">
                      {s.goals}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.yellows > 0 ? (
                        <span className="text-yellow-600 font-bold">{s.yellows}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.reds > 0 ? (
                        <span className="text-red-600 font-bold">{s.reds}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Match history */}
      {matchHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-text mb-4">Historie zápasů</h2>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="text-left px-4 py-3 font-semibold text-text-muted">
                      Datum
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-text-muted">
                      Soupeř
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-text-muted">
                      Skóre
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-text-muted">
                      Góly
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-text-muted">
                      Karty
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-text-muted hidden md:table-cell">
                      ZS/ST
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matchHistory.map((m) => {
                    const isWin = m.is_home
                      ? m.score_home > m.score_away
                      : m.score_away > m.score_home;
                    const isDraw = m.score_home === m.score_away;
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border last:border-0 hover:bg-surface-muted"
                      >
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                          {formatDateShort(m.date)}
                        </td>
                        <td className="px-4 py-3 text-text font-medium">
                          {m.is_home ? `Dolany - ${m.opponent}` : `${m.opponent} - Dolany`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg font-bold text-xs ${
                              isWin
                                ? "bg-green-100 text-green-700"
                                : isDraw
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {m.score_home}:{m.score_away}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.goals > 0 ? (
                            <span className="font-bold text-brand-red">{m.goals}</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.yellows > 0 || m.reds > 0 ? (
                            <span>
                              {m.yellows > 0 && (
                                <span className="text-yellow-600 font-bold mr-1">
                                  {m.yellows}ŽK
                                </span>
                              )}
                              {m.reds > 0 && (
                                <span className="text-red-600 font-bold">
                                  {m.reds}ČK
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              m.is_starter
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {m.is_starter ? "ZS" : "ST"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {matchHistory.length === 0 && (
        <p className="text-center text-text-muted py-8">
          Žádné záznamy o zápasech tohoto hráče.
        </p>
      )}
    </div>
  );
}
