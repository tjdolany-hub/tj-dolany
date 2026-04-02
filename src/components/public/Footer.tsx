"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-gray-400 mt-auto relative overflow-hidden footer-bg">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-red/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-yellow/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo.png" alt="TJ Dolany" width={32} height={32} />
              <span className="text-white font-bold text-sm tracking-tight">
                TJ Dolany
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Fotbalový klub a sokolovna.
              <br />
              Dolany u Jaroměře.
              <br />
              Od roku 1970.
            </p>
          </div>

          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">
              Navigace
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/aktuality", label: "Aktuality" },
                { href: "/tym", label: "Tým" },
                { href: "/plan-akci", label: "Plán akcí" },
                { href: "/o-klubu", label: "O klubu" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">
              Rychlé odkazy
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/tym" className="hover:text-white transition-colors">
                  Kádr mužstva
                </Link>
              </li>
              <li>
                <Link href="/plan-akci" className="hover:text-white transition-colors">
                  Kalendář akcí
                </Link>
              </li>
              <li>
                <Link href="/o-klubu" className="hover:text-white transition-colors">
                  Historie klubu
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">
              Kontakt
            </h3>
            <div className="text-sm space-y-3">
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-brand-red shrink-0" />
                Dolany u Jaroměře
              </p>
              <p className="flex items-center gap-2">
                <Mail size={14} className="text-brand-red shrink-0" />
                <a
                  href="mailto:info@tjdolany.net"
                  className="hover:text-white transition-colors"
                >
                  info@tjdolany.net
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} TJ Dolany. Všechna práva
            vyhrazena.
          </p>
          <a
            href="https://www.carbeat.cz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Vytvořeno
            <Image src="/sponsors/carbeat.png" alt="CarBeat.cz" width={20} height={20} className="rounded" />
            <span className="font-semibold">CarBeat.cz</span>
          </a>
          <Link
            href="/login"
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Správa webu
          </Link>
        </div>
      </div>
    </footer>
  );
}
