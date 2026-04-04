"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { POSITION_COLORS, POSITION_LABELS } from "@/lib/utils";
import { JerseyIcon, BallIcon, YellowCard, RedCard } from "@/components/ui/StatIcons";

interface PlayerCardProps {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  birth_date?: string | null;
  position: string;
  number?: number | null;
  photo?: string | null;
  description?: string | null;
  stats?: { matches: number; goals: number; yellows: number; reds: number } | null;
}

function calcAge(birthDate: string): number {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export default function PlayerCard({
  id,
  name,
  first_name,
  last_name,
  nickname,
  birth_date,
  position,
  number,
  photo,
  stats,
}: PlayerCardProps) {
  const posColor = POSITION_COLORS[position] || "bg-gray-500 text-white";
  const posLabel = POSITION_LABELS[position] || position;

  return (
    <Link href={`/tym/${id}`}>
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="bg-surface rounded-xl border border-border-strong overflow-hidden hover:shadow-xl hover:shadow-brand-red/10 transition-shadow duration-300 cursor-pointer"
      >
        <div className="relative aspect-square bg-gradient-to-br from-brand-dark to-brand-dark-light overflow-hidden">
          {photo ? (
            <Image
              src={photo}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
              sizes="(max-width: 768px) 33vw, 16vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white/30">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </div>
          )}
          {number && (
            <div className="absolute top-2 right-2 bg-brand-dark/80 backdrop-blur-sm text-brand-yellow font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full border border-brand-yellow/30">
              {number}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="p-3 text-center h-[130px] flex flex-col justify-start">
          <h3 className="font-bold text-text text-sm tracking-tight leading-tight">
            {first_name || last_name ? `${first_name || ""} ${last_name || ""}`.trim() : name}
          </h3>
          {nickname && (
            <p className="text-xs text-text-muted">&quot;{nickname}&quot;</p>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${posColor}`}>
              {posLabel}
            </span>
          </div>
          {birth_date && (
            <p className="text-[11px] text-text-muted mt-1">{calcAge(birth_date)} let</p>
          )}
          {stats && (stats.matches > 0 || stats.goals > 0 || stats.yellows > 0 || stats.reds > 0) && (
            <div className="flex items-center justify-center gap-3 mt-1.5 text-[11px] text-text-muted">
              {stats.matches > 0 && (
                <span className="flex items-center gap-0.5">
                  <JerseyIcon className="w-3.5 h-3.5 text-text-muted" />
                  <span className="font-semibold">{stats.matches}</span>
                </span>
              )}
              {stats.goals > 0 && (
                <span className="flex items-center gap-0.5">
                  <BallIcon className="w-3.5 h-3.5 text-text-muted" />
                  <span className="font-semibold">{stats.goals}</span>
                </span>
              )}
              {stats.yellows > 0 && (
                <span className="flex items-center gap-0.5">
                  <YellowCard />
                  <span className="font-semibold">{stats.yellows}</span>
                </span>
              )}
              {stats.reds > 0 && (
                <span className="flex items-center gap-0.5">
                  <RedCard />
                  <span className="font-semibold">{stats.reds}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
