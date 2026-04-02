"use client";

import { motion } from "framer-motion";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Mail, MapPin, Phone, Users } from "lucide-react";
import Link from "next/link";

export default function ONasClient() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2 flex items-center justify-center gap-2"><span className="w-1 h-5 bg-brand-red rounded-full" />Náš klub</p>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">
          O nás
        </h1>
      </motion.div>

      {/* About */}
      <AnimatedSection className="mb-10">
        <section>
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            O klubu
          </h2>
          <div className="bg-surface rounded-xl border border-border p-6 prose max-w-none">
            <p>
              Tělovýchovná jednota Dolany u Jaroměře sdružuje občany obce a okolí
              ke sportovnímu vyžití a společenskému životu. Tělovýchovná činnost
              v obci má dlouholetou tradici — po druhé světové válce zde místní
              nadšenci svépomocí postavili sokolovnu a začali cvičit.
            </p>
            <p>
              Koncem šedesátých let vzniká v obci fotbalové hřiště a v roce <strong>1970</strong> byl
              založen fotbalový oddíl. Dolaňáci se pravidelně účastnili Zlatého poháru
              zemědělských družstev, kde dosáhli na skvělé osmé místo v celostátní soutěži.
              Fotbalisté dodnes hrají důstojnou roli v mistrovských soutěžích Okresního
              přeboru Náchodska.
            </p>
            <p>
              V Dolanech se nehraje pouze fotbal — zmodernizovaný sportovní areál slouží
              škole i široké veřejnosti. V sokolovně se hraje stolní tenis, florbal,
              na kurtu volejbal i nohejbal.
            </p>
            <p>
              <Link href="/historie" className="text-brand-red font-semibold hover:underline">
                Více o historii klubu →
              </Link>
            </p>
          </div>
        </section>
      </AnimatedSection>

      {/* Board */}
      <AnimatedSection delay={0.1} className="mb-10">
        <section>
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Výbor TJ Dolany
          </h2>
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-start gap-3 text-text-muted">
              <Users size={18} className="text-brand-red mt-0.5 shrink-0" />
              <p>Složení výboru bude doplněno.</p>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Contact */}
      <AnimatedSection delay={0.15} className="mb-10">
        <section>
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Kontaktní údaje
          </h2>
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-text mb-3">Adresa</h3>
                <div className="flex items-start gap-3 text-text-muted">
                  <MapPin size={18} className="text-brand-red mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-text">TJ Dolany</p>
                    <p>Dolany 98</p>
                    <p>552 01 Dolany u Jaroměře</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-text mb-3">Kontakt</h3>
                <div className="space-y-3">
                  <a
                    href="tel:+420604864424"
                    className="flex items-center gap-3 text-text-muted hover:text-brand-red transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-red/10 flex items-center justify-center group-hover:bg-brand-red/20 transition-colors">
                      <Phone size={16} className="text-brand-red" />
                    </div>
                    604 864 424
                  </a>
                  <a
                    href="mailto:tjdolany@gmail.com"
                    className="flex items-center gap-3 text-text-muted hover:text-brand-red transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-red/10 flex items-center justify-center group-hover:bg-brand-red/20 transition-colors">
                      <Mail size={16} className="text-brand-red" />
                    </div>
                    tjdolany@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Map */}
      <AnimatedSection delay={0.2}>
        <section>
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Kde nás najdete
          </h2>
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-lg">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5000!2d15.882!3d50.367!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470e7a0000000001%3A0x1!2sDolany+u+Jarom%C4%9B%C5%99e!5e0!3m2!1scs!2scz!4v1"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa - Dolany u Jaroměře"
            />
          </div>
        </section>
      </AnimatedSection>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsOrganization",
            name: "TJ Dolany",
            sport: "Football",
            foundingDate: "1970",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Dolany 98",
              postalCode: "552 01",
              addressLocality: "Dolany u Jaroměře",
              addressRegion: "Královéhradecký kraj",
              addressCountry: "CZ",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: "50.367",
              longitude: "15.882",
            },
            email: "tjdolany@gmail.com",
            telephone: "+420604864424",
            url: "https://tjdolany.net",
          }),
        }}
      />
    </div>
  );
}
