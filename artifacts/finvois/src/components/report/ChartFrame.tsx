import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ChartFrameProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  /** Height of the chart area in px */
  chartHeight?: number;
  /** Optional footer slot (e.g., InsightCaption) */
  footer?: ReactNode;
}

/**
 * Premium wrapper for chart-driven sections. Standardizes the caption
 * block + chart pairing used across P&L, Balance Sheet, Cash Flow, etc.
 */
export function ChartFrame({ eyebrow, title, description, children, chartHeight = 360, footer }: ChartFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="surface-card rounded-2xl p-7 md:p-8"
    >
      <div className="mb-6">
        {eyebrow && <div className="text-eyebrow text-gold mb-2">{eyebrow}</div>}
        <h3 className="font-display text-[22px] leading-tight text-foreground">{title}</h3>
        {description && (
          <p className="mt-2 text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      <div style={{ height: chartHeight }} className="w-full">
        {children}
      </div>
      {footer}
    </motion.div>
  );
}
