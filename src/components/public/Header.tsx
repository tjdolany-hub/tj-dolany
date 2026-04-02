"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Úvod" },
  { href: "/aktuality", label: "Aktuality" },
  { href: "/tym", label: "Tým" },
  { href: "/plan-akci", label: "Plán akcí" },
  { href: "/o-klubu", label: "O klubu" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface shadow-sm" style={{ borderBottom: "3px solid", borderImage: "linear-gradient(90deg, #C41E3A, #F5C518, #C41E3A) 1" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="TJ Dolany"
            width={36}
            height={36}
            className="object-contain"
          />
          <div className="hidden sm:block">
            <span className="text-sm font-bold text-text tracking-tight">
              TJ Dolany
            </span>
            <span className="block text-[11px] text-text-muted font-medium -mt-0.5">
              Dolany u Jaroměře
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                pathname === item.href
                  ? "text-brand-red bg-brand-red/10"
                  : "text-text-muted hover:text-text"
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-2 border-l border-border pl-2">
            <ThemeToggle />
          </div>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            className="text-text p-2 hover:bg-surface rounded-lg transition-colors"
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden glass border-t border-border">
          <nav className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-brand-red bg-brand-red/10"
                    : "text-text-muted hover:text-text hover:bg-surface"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
