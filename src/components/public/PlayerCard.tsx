"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { POSITION_COLORS, POSITION_LABELS } from "@/lib/utils";

interface PlayerCardProps {
  name: string;
  position: string;
  number?: number | null;
  photo?: string | null;
  description?: string | null;
}

export default function PlayerCard({
  name,
  position,
  number,
  photo,
  description,
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
        <h3 className="font-bold text-text text-lg tracking-tight">{name}</h3>
        <span
          className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${posColor}`}
        >
          {posLabel}
        </span>
        {description && (
          <p className="text-sm text-text-muted mt-2 line-clamp-2">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
