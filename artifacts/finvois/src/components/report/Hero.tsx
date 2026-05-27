import { motion } from "framer-motion";
import { KpiTile } from "./KpiTile";

interface HeroProps {
  firmName: string;
  tagline?: string | null;
  kpis: { label: string; value: string | null | undefined }[];
}

export function Hero({ firmName, tagline, kpis }: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-hero-gradient text-white px-10 md:px-14 pt-14 pb-10 mb-10 shadow-lg">
      {/* Decorative grain / vignette */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
           style={{
             backgroundImage:
               "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
           }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative text-center max-w-3xl mx-auto"
      >
        <div className="text-eyebrow-lg text-gold/90 mb-5" data-testid="hero-eyebrow">
          Detailed Project Report
        </div>
        <h1
          className="font-display text-[44px] md:text-[56px] leading-[1.05] text-white mb-4"
          data-testid="hero-firm"
        >
          {firmName}
        </h1>
        {tagline && (
          <p className="text-[15px] md:text-base text-white/65 max-w-xl mx-auto leading-relaxed">
            {tagline}
          </p>
        )}
      </motion.div>

      {/* Embedded KPI tiles */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
        }}
        className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
      >
        {kpis.map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            <KpiTile label={kpi.label} value={kpi.value} variant="glass" />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
