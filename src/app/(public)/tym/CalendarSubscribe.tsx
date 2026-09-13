"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarPlus, Apple, Smartphone, Copy, Check } from "lucide-react";

const FEED_PATH = "/api/calendar/zapasy.ics";

/** "Odebírat zápasy v kalendáři" — subscription links for iPhone (webcal) and Google Calendar. */
export default function CalendarSubscribe() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Built on click — window is not available during SSR
  const feedUrl = () => `${window.location.origin}${FEED_PATH}`;
  const webcalUrl = () => feedUrl().replace(/^https?:/, "webcal:");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const itemClass = "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-text hover:bg-surface-muted text-left";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text hover:bg-surface-muted transition-colors">
        <CalendarPlus size={16} className="text-brand-red" />
        Odebírat v kalendáři
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 mt-1 w-72 bg-surface border border-border rounded-lg shadow-lg p-2">
          <p className="px-3 pt-1 pb-2 text-xs text-text-muted">
            Všechny zápasy se přidají do kalendáře v telefonu a změny termínů se aktualizují samy.
          </p>
          <button type="button" className={itemClass} onClick={() => { window.location.href = webcalUrl(); }}>
            <Apple size={16} /> iPhone / Mac
          </button>
          <button type="button" className={itemClass}
            onClick={() => window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl())}`, "_blank", "noopener")}>
            <Smartphone size={16} /> Google Kalendář (Android)
          </button>
          <button type="button" className={itemClass} onClick={copy}>
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            {copied ? "Odkaz zkopírován" : "Kopírovat odkaz"}
          </button>
        </div>
      )}
    </div>
  );
}
