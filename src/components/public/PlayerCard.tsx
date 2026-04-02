"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { POSITION_COLORS, POSITION_LABELS } from "@/lib/utils";

interface PlayerCardProps {
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
  name,
  first_name,
  last_name,
  nickname,
  birth_date,
  position,
  number,
  photo,
  description,
  stats,
}: PlayerCardProps) {
  const posColor = POSITION_COLORS[position] || "bg-gray-500 text-white";
  const posLabel = POSITION_LABELS[position] || position;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-surface rounded-xl border border-border overflow-hidden hover:shadow-xl hover:shadow-brand-red/10 transition-shadow duration-300"
    >
      <div className="relative aspect-square bg-gradient-to-br from-brand-dark to-brand-dark-light overflow-hidden">
        {photo ? (
          <Image
            src={photo}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-white/30">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>
        )}
        {number && (
          <div className="absolute top-3 right-3 bg-brand-dark/80 backdrop-blur-sm text-brand-yellow font-bold text-lg w-10 h-10 flex items-center justify-center rounded-full border border-brand-yellow/30">
            {number}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="p-4 text-center">
        <h3 className="font-bold text-text text-lg tracking-tight">
          {first_name || last_name ? `${first_name || ""} ${last_name || ""}`.trim() : name}
        </h3>
        {nickname && (
          <p className="text-sm text-text-muted -mt-0.5">&quot;{nickname}&quot;</p>
        )}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${posColor}`}>
            {posLabel}
          </span>
          {birth_date && (
            <span className="text-xs text-text-muted">{calcAge(birth_date)} let</span>
          )}
        </div>
        {stats && (stats.matches > 0 || stats.goals > 0) && (
          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-text-muted">
            <span>{stats.matches} záp.</span>
            <span>{stats.goals} gólů</span>
            {stats.yellows > 0 && <span className="text-yellow-600">{stats.yellows} ŽK</span>}
            {stats.reds > 0 && <span className="text-red-600">{stats.reds} ČK</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
