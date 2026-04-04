"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true); // default dark to match SSR/initial script
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") !== "light");
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light"
    );
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (!mounted) return <div className="w-[34px] h-[34px]" />;

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
      aria-label="Přepnout téma"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
