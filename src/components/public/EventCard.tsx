"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { formatDateCzech } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface EventCardProps {
  title: string;
  description?: string | null;
  date: string;
  poster?: string | null;
}

export default function EventCard({
  title,
  description,
  date,
  poster,
}: EventCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-surface rounded-xl border border-border overflow-hidden hover:shadow-xl hover:shadow-brand-red/10 hover:border-brand-red/20 transition-all duration-300 group"
    >
      {poster ? (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="bg-brand-red text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm">
              {formatDateCzech(date)}
            </span>
          </div>
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-brand-red/10 to-brand-yellow/10 flex items-center justify-center">
          <Calendar size={32} className="text-brand-red/40" />
        </div>
      )}
      <div className="p-5">
        {!poster && (
          <span className="bg-brand-red text-white text-xs font-bold px-3 py-1 rounded-lg inline-block mb-3">
            {formatDateCzech(date)}
          </span>
        )}
        <h3 className="font-bold text-text text-lg tracking-tight group-hover:text-brand-red transition-colors">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-text-muted mt-2 line-clamp-3">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
