"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

interface MatchTickerProps {
  dateLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
}

function splitLetters(text: string, keyPrefix: string) {
  return Array.from(text).map((ch, i) => (
    <span
      key={`${keyPrefix}-${i}`}
      data-ticker-letter
      className="ticker-letter"
    >
      {ch === " " ? "\u00A0" : ch}
    </span>
  ));
}

export default function MatchTicker({
  dateLabel,
  homeTeam,
  awayTeam,
  homeLogo,
  awayLogo,
}: MatchTickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const ball = ballRef.current;
    if (!root || !ball) return;

    const letters = Array.from(
      root.querySelectorAll<HTMLSpanElement>("[data-ticker-letter]")
    );
    let rafId = 0;

    const tick = () => {
      const ballRect = ball.getBoundingClientRect();
      // Skip highlight when ball is hidden (fade-out phase).
      const visible =
        ballRect.width > 0 &&
        parseFloat(getComputedStyle(ball).opacity || "1") > 0.1;
      const ballCenterX = ballRect.left + ballRect.width / 2;
      const radius = Math.max(ballRect.width, 18) * 0.75;

      for (const letter of letters) {
        const r = letter.getBoundingClientRect();
        const letterCenterX = r.left + r.width / 2;
        const dist = Math.abs(letterCenterX - ballCenterX);
        if (visible && dist < radius) {
          if (!letter.classList.contains("ticker-letter-active")) {
            letter.classList.add("ticker-letter-active");
          }
        } else if (letter.classList.contains("ticker-letter-active")) {
          letter.classList.remove("ticker-letter-active");
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [dateLabel, homeTeam, awayTeam]);

  return (
    <div
      ref={rootRef}
      className="bg-brand-red text-white overflow-hidden relative"
    >
      <span ref={ballRef} className="ticker-ball" aria-hidden="true">
        ⚽
      </span>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-center gap-1.5 sm:gap-2.5">
        <span className="text-[11px] sm:text-sm font-semibold shrink-0">
          {splitLetters(dateLabel, "d")}
        </span>
        <span className="text-[11px] sm:text-sm text-white/70 shrink-0">—</span>
        {homeLogo && (
          <Image
            src={homeLogo}
            alt=""
            width={18}
            height={18}
            className="object-contain shrink-0 sm:w-[22px] sm:h-[22px] drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]"
          />
        )}
        <span className="text-[11px] sm:text-sm font-semibold whitespace-nowrap">
          {splitLetters(homeTeam, "h")}
        </span>
        <span className="text-[11px] sm:text-sm font-semibold">-</span>
        {awayLogo && (
          <Image
            src={awayLogo}
            alt=""
            width={18}
            height={18}
            className="object-contain shrink-0 sm:w-[22px] sm:h-[22px] drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]"
          />
        )}
        <span className="text-[11px] sm:text-sm font-semibold whitespace-nowrap">
          {splitLetters(awayTeam, "a")}
        </span>
      </div>
    </div>
  );
}
