"use client";

import { motion } from "framer-motion";
import EventCard from "@/components/public/EventCard";
import AnimatedSection, { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import type { Database } from "@/types/database";

type FutureEvent = Database["public"]["Tables"]["future_events"]["Row"];

export default function PlanAkciClient({
  upcoming,
  past,
}: {
  upcoming: FutureEvent[];
  past: FutureEvent[];
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2">Kalendář akcí</p>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">
          Plán akcí
        </h1>
      </motion.div>

      {upcoming.length > 0 ? (
        <AnimatedSection className="mb-16">
          <h2 className="text-2xl font-bold text-text tracking-tight mb-8 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-brand-red rounded-full" />
            Nadcházející akce
          </h2>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard
                  title={event.title}
                  description={event.description}
                  date={event.date}
                  poster={event.poster}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </AnimatedSection>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-text-muted mb-16 py-12 text-lg"
        >
          V tuto chvíli nemáme žádné naplánované akce.
        </motion.p>
      )}

      {past.length > 0 && (
        <AnimatedSection>
          <h2 className="text-2xl font-bold text-text-muted tracking-tight mb-8 flex items-center gap-3">
            <span className="w-8 h-0.5 bg-border rounded-full" />
            Proběhlé akce
          </h2>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
            {past.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard
                  title={event.title}
                  description={event.description}
                  date={event.date}
                  poster={event.poster}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </AnimatedSection>
      )}
    </div>
  );
}
