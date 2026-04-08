"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Trophy,
  CalendarDays,
  LogOut,
  Shield,
  History,
  Trash2,
  Menu,
  X,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/articles", label: "Články", icon: FileText },
  { href: "/admin/players", label: "Hráči", icon: Users },
  { href: "/admin/events", label: "Plán akcí", icon: CalendarDays },
  { href: "/admin/matches", label: "Zápasy", icon: Trophy },
  { href: "/admin/treninky", label: "Tréninky", icon: ClipboardList },
  { href: "/admin/kronika", label: "Kronika", icon: BookOpen },
  { href: "/admin/users", label: "Uživatelé", icon: Shield },
  { href: "/admin/audit", label: "Historie změn", icon: History },
  { href: "/admin/trash", label: "Koš", icon: Trash2 },
];

function SidebarContent({ pathname, onLogout, onNavClick }: { pathname: string; onLogout: () => void; onNavClick?: () => void }) {
  return (
    <>
      <div className="p-5 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-3" onClick={onNavClick}>
          <Image src="/logo.png" alt="TJ Dolany" width={32} height={32} />
          <div>
            <span className="text-sm font-bold text-white">TJ Dolany</span>
            <span className="block text-[11px] text-gray-500">Administrace</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-brand-red/10 text-brand-red"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <ThemeToggle />
          <span className="text-sm text-gray-400">Motiv</span>
        </div>
        <Link
          href="/"
          onClick={onNavClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Zobrazit web
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={18} />
          Odhlásit se
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-brand-dark border-b border-white/10 flex items-center px-4 z-50 lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-white p-1">
          <Menu size={24} />
        </button>
        <Link href="/admin" className="flex items-center gap-2 ml-3">
          <Image src="/logo.png" alt="TJ Dolany" width={24} height={24} />
          <span className="text-sm font-bold text-white">Administrace</span>
        </Link>
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-brand-dark border-r border-white/10 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent pathname={pathname} onLogout={handleLogout} onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-brand-dark border-r border-white/10 flex-col z-40 hidden lg:flex">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>
    </>
  );
}
