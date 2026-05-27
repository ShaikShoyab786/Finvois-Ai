import { motion } from "framer-motion";
import { Check, AlertTriangle, Loader2 } from "lucide-react";

interface BriefingCardProps {
  summary?: string | null;
  keyStrengths?: string[] | null;
  riskFactors?: string[] | null;
  isLoading?: boolean;
}

export function BriefingCard({ summary, keyStrengths, riskFactors, isLoading }: BriefingCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10"
    >
      {/* Executive narrative — wider */}
      <div className="lg:col-span-3 surface-card rounded-2xl p-8 md:p-10">
        <div className="text-eyebrow text-gold mb-5">Executive Briefing</div>
        <h2 className="font-display text-[26px] leading-[1.2] text-foreground mb-5">
          The bottom line
        </h2>
        {isLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground text-sm py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating AI briefing…
          </div>
        ) : summary ? (
          <p className="text-[15.5px] leading-[1.75] text-foreground/80" data-testid="briefing-summary">
            {summary}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Executive summary not available for this report.
          </p>
        )}
      </div>

      {/* Strengths + Risks — paired */}
      <div className="lg:col-span-2 grid grid-cols-1 gap-6">
        <div className="surface-card rounded-2xl p-6 md:p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500/80" />
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
            <div className="text-eyebrow text-emerald-700">Key Strengths</div>
          </div>
          {isLoading ? (
            <div className="space-y-2.5">
              <div className="h-3 rounded bg-muted animate-pulse" />
              <div className="h-3 rounded bg-muted animate-pulse w-5/6" />
              <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
            </div>
          ) : keyStrengths && keyStrengths.length > 0 ? (
            <ul className="space-y-2.5">
              {keyStrengths.slice(0, 4).map((s, i) => (
                <li key={i} className="text-[13.5px] leading-snug text-foreground/85 flex gap-2.5">
                  <span className="text-emerald-500/70 mt-1 text-[10px]">●</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">No strengths identified.</p>
          )}
        </div>

        <div className="surface-card rounded-2xl p-6 md:p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500/80" />
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
            <div className="text-eyebrow text-amber-700">Risk Factors</div>
          </div>
          {isLoading ? (
            <div className="space-y-2.5">
              <div className="h-3 rounded bg-muted animate-pulse" />
              <div className="h-3 rounded bg-muted animate-pulse w-4/6" />
              <div className="h-3 rounded bg-muted animate-pulse w-5/6" />
            </div>
          ) : riskFactors && riskFactors.length > 0 ? (
            <ul className="space-y-2.5">
              {riskFactors.slice(0, 4).map((s, i) => (
                <li key={i} className="text-[13.5px] leading-snug text-foreground/85 flex gap-2.5">
                  <span className="text-amber-500/70 mt-1 text-[10px]">●</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">No risks identified.</p>
          )}
        </div>
      </div>
    </motion.section>
  );
}
