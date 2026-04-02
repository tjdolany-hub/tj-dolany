"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Trophy,
  Image as ImageIcon,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/articles", label: "Články", icon: FileText },
  { href: "/admin/players", label: "Hráči", icon: Users },
  { href: "/admin/events", label: "Plán akcí", icon: CalendarDays },
  { href: "/admin/matches", label: "Zápasy", icon: Trophy },
  { href: "/admin/albums", label: "Fotoalba", icon: ImageIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-brand-dark border-r border-white/10 flex flex-col z-40 hidden lg:flex">
      <div className="p-5 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-3">
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

      <div className="p-3 border-t border-white/10">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors mb-1"
        >
          Zobrazit web
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={18} />
          Odhlásit se
        </button>
      </div>
    </aside>
  );
}
