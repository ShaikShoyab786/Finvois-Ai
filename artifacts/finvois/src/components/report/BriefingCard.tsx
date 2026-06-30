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
      className="flex flex-col gap-6 mb-10"
    >
      {/* Executive narrative — full width */}
      <div className="surface-card rounded-2xl p-8 md:p-10">
        <div className="text-eyebrow text-brand mb-5">Executive Briefing</div>
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

      {/* Key Strengths — full width */}
      <div className="surface-card rounded-2xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500/80" />
        <div className="flex items-center gap-2 mb-5">
          <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
          <div className="text-eyebrow text-emerald-700">Key Strengths</div>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-3.5 rounded bg-muted animate-pulse" />
            <div className="h-3.5 rounded bg-muted animate-pulse w-5/6" />
            <div className="h-3.5 rounded bg-muted animate-pulse w-3/4" />
          </div>
        ) : keyStrengths && keyStrengths.length > 0 ? (
          <ul className="space-y-3">
            {keyStrengths.map((s, i) => (
              <li key={i} className="text-[15px] leading-[1.7] text-foreground/85 flex gap-3">
                <span className="text-emerald-500/70 mt-2 text-[10px] flex-shrink-0">●</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No strengths identified.</p>
        )}
      </div>

      {/* Risk Factors — full width */}
      <div className="surface-card rounded-2xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500/80" />
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
          <div className="text-eyebrow text-amber-700">Risk Factors</div>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-3.5 rounded bg-muted animate-pulse" />
            <div className="h-3.5 rounded bg-muted animate-pulse w-4/6" />
            <div className="h-3.5 rounded bg-muted animate-pulse w-5/6" />
          </div>
        ) : riskFactors && riskFactors.length > 0 ? (
          <ul className="space-y-3">
            {riskFactors.map((s, i) => (
              <li key={i} className="text-[15px] leading-[1.7] text-foreground/85 flex gap-3">
                <span className="text-amber-500/70 mt-2 text-[10px] flex-shrink-0">●</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No risks identified.</p>
        )}
      </div>
    </motion.section>
  );
}
