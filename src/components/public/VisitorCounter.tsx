"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

type Stats = { today: number; week: number; month: number; total: number };

const SESSION_KEY = "tjd-visit-recorded";

export default function VisitorCounter() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let recorded = false;
    try { recorded = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* storage blocked */ }

    fetch("/api/visits", { method: recorded ? "GET" : "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Stats | null) => {
        if (!data) return;
        setStats(data);
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* storage blocked */ }
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const items = [
    { label: "Dnes", value: stats.today },
    { label: "7 dní", value: stats.week },
    { label: "30 dní", value: stats.month },
    { label: "Celkem", value: stats.total },
  ];

  return (
    <div className="flex items-center gap-3 text-xs text-gray-400" title="Počet návštěvníků webu">
      <Eye size={14} className="text-brand-red shrink-0" />
      {items.map((item) => (
        <span key={item.label} className="whitespace-nowrap">
          {item.label} <span className="font-semibold text-white tabular-nums">{item.value.toLocaleString("cs-CZ")}</span>
        </span>
      ))}
    </div>
  );
}
