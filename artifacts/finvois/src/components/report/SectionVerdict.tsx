import { Sparkles } from "lucide-react";

type Tone = "neutral" | "good" | "warn" | "risk";

/**
 * AI-generated "credit committee read" rendered as a discreet callout at
 * the top of each report section. Auto-detects sentiment from the verdict
 * text so the accent stripe carries an honest emotional signal — green for
 * positive reads, amber for cautious, rose for risk flags, gold for neutral.
 *
 * Render unconditionally — handles its own loading/empty states so callers
 * don't have to gate on them.
 */
export function SectionVerdict({
  verdict,
  isLoading,
}: {
  verdict: string | null | undefined;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="surface-card rounded-2xl p-5 mb-7 relative overflow-hidden border-l-[3px] border-l-gold/40">
        <div className="flex items-center gap-2 text-eyebrow text-gold mb-2.5">
          <Sparkles className="w-3 h-3" />
          AI Credit Read
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-11/12 bg-foreground/5 rounded animate-pulse" />
          <div className="h-3.5 w-3/4 bg-foreground/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }
  if (!verdict) return null;

  const tone = detectTone(verdict);
  const border = {
    good: "border-l-emerald-500/70",
    warn: "border-l-amber-500/70",
    risk: "border-l-rose-500/70",
    neutral: "border-l-gold/70",
  }[tone];
  const dot = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    risk: "bg-rose-500",
    neutral: "bg-gold",
  }[tone];

  return (
    <div className={`surface-card rounded-2xl p-5 mb-7 relative overflow-hidden border-l-[3px] ${border}`}>
      <div className="flex items-center gap-2 text-eyebrow text-gold mb-2.5">
        <Sparkles className="w-3 h-3" />
        AI Credit Read
        <span className={`ml-1 w-1.5 h-1.5 rounded-full ${dot}`} />
      </div>
      <p className="text-[14px] leading-relaxed text-foreground/90 max-w-3xl">{verdict}</p>
    </div>
  );
}

const NEG_RX = /\b(weak|risk|concern|insufficient|inadequate|below|deficit|gap|stress|stretch|distress|tight|breach|short(?:fall)?|negative|fail)\w*/i;
const CAUTION_RX = /\b(modest|moderate|thin|marginal|conditional|caution|monitor|watch|elevated|borderline|mixed)\w*/i;
const POS_RX = /\b(strong|robust|comfortable|healthy|solid|favou?rable|sustainable|prudent|deleverage|surpass|exceed|above|positive|cover|on track)\w*/i;

function detectTone(text: string): Tone {
  if (NEG_RX.test(text)) return "risk";
  if (CAUTION_RX.test(text)) return "warn";
  if (POS_RX.test(text)) return "good";
  return "neutral";
}
