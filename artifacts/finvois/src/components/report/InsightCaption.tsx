import { Sparkles } from "lucide-react";

interface InsightCaptionProps {
  text: string | null | undefined;
  label?: string;
}

/**
 * AI-style commentary block that sits below a chart or table to add
 * intelligent context. Renders nothing if no insight is available.
 */
export function InsightCaption({ text, label = "AI Insight" }: InsightCaptionProps) {
  if (!text) return null;
  return (
    <div
      className="mt-5 flex gap-3 items-start px-5 py-4 rounded-xl bg-gold/[0.06] border border-gold/20"
      data-testid="insight-caption"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/15 text-gold flex items-center justify-center mt-0.5">
        <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-eyebrow text-gold mb-1.5">{label}</div>
        <p className="text-[13.5px] leading-relaxed text-foreground/85">{text}</p>
      </div>
    </div>
  );
}
