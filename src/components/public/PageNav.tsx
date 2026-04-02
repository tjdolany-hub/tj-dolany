"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Úvod",
  "/aktuality": "Aktuality",
  "/tym": "Tým",
  "/plan-akci": "Plán akcí",
  "/galerie": "Galerie",
  "/o-klubu": "O klubu",
};

export default function PageNav() {
  const pathname = usePathname();

  // Don't show on homepage
  if (pathname === "/") return null;

  // Build breadcrumb: Home > current page (or detail)
  const basePath = "/" + (pathname.split("/")[1] || "");
  const baseTitle = PAGE_TITLES[basePath];
  const isDetail = pathname !== basePath && basePath !== "/";

  return (
    <div className="fixed top-[67px] left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center gap-2 text-sm">
        <Link href="/" className="text-text-muted hover:text-brand-red transition-colors text-xs font-medium">
          Úvod
        </Link>
        {baseTitle && (
          <>
            <ChevronRight size={12} className="text-text-muted/50" />
            {isDetail ? (
              <Link href={basePath} className="text-text-muted hover:text-brand-red transition-colors text-xs font-medium">
                {baseTitle}
              </Link>
            ) : (
              <span className="text-text text-xs font-semibold">{baseTitle}</span>
            )}
          </>
        )}
        {isDetail && (
          <>
            <ChevronRight size={12} className="text-text-muted/50" />
            <span className="text-text text-xs font-semibold truncate">Detail</span>
          </>
        )}
      </div>
    </div>
  );
}
