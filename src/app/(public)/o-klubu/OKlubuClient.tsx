"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Image from "next/image";
import { ChevronDown, ExternalLink, Mail, MapPin, Phone, Users } from "lucide-react";

const SEASONS = [
  "2018/2019",
  "2017/2018",
  "2016/2017",
  "2015/2016",
  "2014/2015",
  "2013/2014",
  "2012/2013",
  "2011/2012",
  "2010/2011",
  "2009/2010",
  "2008/2009",
  "2007/2008",
  "2006/2007",
  "2005/2006",
  "2004/2005",
  "2003/2004",
];

export default function OKlubuClient() {
  const [openSeason, setOpenSeason] = useState<string | null>(null);

  const sections = [
    { id: "stary-web", label: "Starý web" },
    { id: "o-tj", label: "O TJ Dolany" },
    { id: "zalozeni", label: "Založení" },
    { id: "sokolovna", label: "Sokolovna" },
    { id: "historie", label: "Historie" },
    { id: "vybor", label: "Výbor" },
    { id: "kontakt", label: "Kontakt" },
    { id: "mapa", label: "Mapa" },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2 flex items-center justify-center gap-2"><span className="w-1 h-5 bg-brand-red rounded-full" />Náš klub</p>
          <h1 className="text-4xl font-extrabold text-text tracking-tight">O klubu</h1>
        </motion.div>
      </div>

      {/* Section navigation — sticky */}
      <div className="sticky top-16 z-30 bg-surface-muted/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap justify-center gap-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
      </div>

      {/* Starý web */}
      <div className="bg-surface py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection>
        <section id="stary-web" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Starý web
          </h2>
          <p className="text-center text-text-muted mb-6">
            Původní webové stránky TJ Dolany, které fungovaly od roku 2003. Obsahují kompletní archiv aktualit, fotek a dokumentů.
          </p>
          <a
            href="https://tjdolany-hub.github.io/tjdolany-legacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="relative rounded-xl overflow-hidden border border-border shadow-lg hover:shadow-xl transition-shadow">
              <Image
                src="/legacy-header.webp"
                alt="Starý web TJ Dolany"
                width={960}
                height={120}
                className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-white text-brand-dark px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg">
                  Otevřít starý web <ExternalLink size={16} />
                </span>
              </div>
            </div>
          </a>
        </section>
      </AnimatedSection>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* About */}
      <div className="bg-surface-alt py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection>
        <section id="o-tj" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            O TJ Dolany
          </h2>
          <div className="prose max-w-none">
            <p>
              Tělovýchovná jednota Dolany u Jaroměře sdružuje občany obce a okolí
              ke sportovnímu vyžití a společenskému životu. Tělovýchovná činnost
              v obci má dlouholetou tradici — po druhé světové válce zde místní
              nadšenci svépomocí postavili sokolovnu a začali cvičit.
            </p>
            <p>
              V Dolanech se nehraje pouze fotbal — zmodernizovaný sportovní areál slouží
              škole i široké veřejnosti. V sokolovně se hraje stolní tenis, florbal,
              na kurtu volejbal i nohejbal.
            </p>
          </div>
        </section>
      </AnimatedSection>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Founding */}
      <div className="bg-surface py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection delay={0.05}>
        <section id="zalozeni" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Založení klubu
          </h2>
          <div className="prose max-w-none">
            <p>
              Tělovýchovná činnost v obci Dolany u Jaroměře má dlouholetou tradici.
              Velkého rozmachu dosáhla po druhé světové válce, kdy místní nadšenci
              svépomocí postavili <strong>sokolovnu</strong> a začali cvičit.
            </p>
            <p>
              Koncem šedesátých let dvacátého století vzniká v obci <strong>fotbalové hřiště</strong>.
              Dalším velkým mezníkem byl rok <strong>1970</strong>, kdy byl v Dolanech založen
              fotbalový oddíl.
            </p>
            <p>
              V té době se Dolanští pravidelně účastnili Zlatého poháru zemědělských družstev.
              Nejlepším výsledkem v celorepublikové soutěži bylo skvělé <strong>osmé místo</strong>.
              Dolaňáci hráli a hrají důstojnou roli také v oficiálních mistrovských soutěžích.
            </p>
            <p>
              Spoustu cenných informací o historii TJ Dolany bylo načerpáno na jaře roku 2004
              po vyjmutí základního kamene ze zdiva původní sokolovny. Pískovcový kvádr ukrýval
              poselství o poválečném budování sokolovny psané vlastnoručně <strong>Josefem Borůvkou</strong>,
              pozdějším ministrem zemědělství. Po následné rekonstrukci sokolovny bylo poselství
              doplněné o vzkaz představitelů obce a současných tělovýchovných aktivistů vráceno
              i s pískovcem zpět do zdiva objektu.
            </p>
          </div>
        </section>
      </AnimatedSection>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Sokolovna */}
      <div className="bg-surface-alt py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection delay={0.1}>
        <section id="sokolovna" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Sokolovna v Dolanech
          </h2>
          <div className="prose max-w-none">
            <h3>70. výročí zahájení budování sokolovny</h3>
            <p>
              V květnu 2017 si obec připomněla 70. výročí zahájení budování dolanské sokolovny.
              Lidé, kteří stáli u zrodu tohoto velkého díla, zaslouží poděkování. I díky jejich
              práci a obětavosti dnes máme v obci důstojné zázemí pro pořádání sportovních,
              kulturních i společenských akcí.
            </p>
            <h3>Rekonstrukce a modernizace</h3>
            <p>
              Celý dolanský sportovní areál byl z majetku TJ Dolany převeden do majetku obce,
              která hradila nutnou rekonstrukci sokolovny a přístavbu klubovny se sociálním zázemím.
              Tělovýchova má areál v dlouhodobém pronájmu.
            </p>
            <p>
              Členové TJ Dolany provedli v sokolovně svépomocí celou řadu důležitých prací —
              výměnu oken, nátěr plechové střechy, úpravy podlahy, instalaci věšáků,
              nové olištování a práce v klubovně. Obec zakoupila topení, díky němuž
              může být sportovní sál v celoročním provozu.
            </p>
            <p>
              V sále jsou florbalové branky a hokejky, koše, míče, žíněnky, podložky na aerobic,
              sítě, mobilní sloupky na volejbal a nohejbal.
            </p>
          </div>
        </section>
      </AnimatedSection>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Historical results */}
      <div className="bg-surface py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection delay={0.15}>
        <section id="historie" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Historické sezony
          </h2>
          <p className="text-text-muted text-sm mb-6">
            Přehled sezon Okresního přeboru Náchodska, ve kterých TJ Dolany soutěžila.
          </p>
          <div className="space-y-2">
            {SEASONS.map((season) => (
              <div key={season} className="rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenSeason(openSeason === season ? null : season)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-muted transition-colors"
                >
                  <span className="font-semibold text-text text-sm">Sezona {season}</span>
                  <motion.div
                    animate={{ rotate: openSeason === season ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={18} className="text-text-muted" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openSeason === season && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-text-muted">
                        <p>
                          Okresní přebor Náchodska, sezona {season}.
                          Podrobné výsledky a tabulky budou doplněny.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Board */}
      <div className="bg-surface-alt py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection delay={0.2}>
        <section id="vybor" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Výbor TJ Dolany
          </h2>
          <div>
            <div className="flex items-start gap-3 text-text-muted">
              <Users size={18} className="text-brand-red mt-0.5 shrink-0" />
              <p>Složení výboru bude doplněno.</p>
            </div>
          </div>
        </section>
      </AnimatedSection>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Contact */}
      <div className="bg-surface py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection delay={0.25}>
        <section id="kontakt" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Kontaktní údaje
          </h2>
          <div>
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
                <div className="mb-2">
                  <p className="font-medium text-text">Pavel Martínek</p>
                  <p className="text-sm text-text-muted">Sekretář</p>
                </div>
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
                    href="mailto:tjdolany@seznam.cz"
                    className="flex items-center gap-3 text-text-muted hover:text-brand-red transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-red/10 flex items-center justify-center group-hover:bg-brand-red/20 transition-colors">
                      <Mail size={16} className="text-brand-red" />
                    </div>
                    tjdolany@seznam.cz
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

      {/* Map */}
      <div className="bg-surface-alt py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection delay={0.3}>
        <section id="mapa" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center justify-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Kde nás najdete
          </h2>
          <div className="rounded-xl overflow-hidden shadow-lg">
            <iframe
              src="https://maps.google.com/maps?q=Dolany+98,+552+01+Dolany+u+Jarom%C4%9B%C5%99e&t=m&z=15&output=embed&hl=cs"
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
      </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />

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
            email: "tjdolany@seznam.cz",
            telephone: "+420604864424",
            url: "https://tjdolany.net",
          }),
        }}
      />
    </div>
  );
}
