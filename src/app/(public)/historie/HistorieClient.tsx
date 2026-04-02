"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { ChevronDown, Landmark, Home, Trophy } from "lucide-react";

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

export default function HistorieClient() {
  const [openSeason, setOpenSeason] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2 flex items-center justify-center gap-2"><span className="w-1 h-5 bg-brand-red rounded-full" />Od roku 1970</p>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">
          Historie
        </h1>
      </motion.div>

      {/* Founding */}
      <AnimatedSection className="mb-10">
        <section>
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center shrink-0">
              <Landmark size={20} className="text-brand-red" />
            </div>
            Založení klubu
          </h2>
          <div className="bg-surface rounded-xl border border-border p-6 prose max-w-none">
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

      {/* Sokolovna */}
      <AnimatedSection delay={0.1} className="mb-10">
        <section>
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center shrink-0">
              <Home size={20} className="text-brand-red" />
            </div>
            Sokolovna v Dolanech
          </h2>
          <div className="bg-surface rounded-xl border border-border p-6 prose max-w-none">
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
              sítě, mobilní sloupky na volejbal a nohejbal. V Dolanech se nehraje pouze fotbal —
              místní zmodernizovaný sportovní areál slouží dolanské škole i široké veřejnosti.
              Tělocvična patří stále častěji stolním tenistům nebo florbalistům.
            </p>
          </div>
        </section>
      </AnimatedSection>

      {/* Historical results */}
      <AnimatedSection delay={0.2}>
        <section>
          <h2 className="text-2xl font-bold text-text tracking-tight mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center shrink-0">
              <Trophy size={20} className="text-brand-red" />
            </div>
            Historické sezony
          </h2>
          <p className="text-text-muted text-sm mb-6">
            Přehled sezon Okresního přeboru Náchodska, ve kterých TJ Dolany soutěžila.
          </p>

          <div className="space-y-2">
            {SEASONS.map((season) => (
              <div key={season} className="bg-surface rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setOpenSeason(openSeason === season ? null : season)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-muted transition-colors"
                >
                  <span className="font-semibold text-text text-sm">
                    Sezona {season}
                  </span>
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
  );
}
