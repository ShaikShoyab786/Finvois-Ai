interface MetricCardProps {
  label: string;
  value: string | null | undefined;
  description?: string;
  tone?: "neutral" | "good" | "warn" | "risk";
}

const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, { bar: string; value: string }> = {
  neutral: { bar: "bg-slate-300", value: "text-foreground" },
  good: { bar: "bg-emerald-500", value: "text-emerald-700" },
  warn: { bar: "bg-amber-500", value: "text-amber-700" },
  risk: { bar: "bg-rose-500", value: "text-rose-700" },
};

/**
 * Used for ratios, financial evaluation metrics — a label + value + 1-line
 * context. Visually heavier than KpiTile (which is for headline figures).
 */
export function MetricCard({ label, value, description, tone = "neutral" }: MetricCardProps) {
  const styles = toneStyles[tone];
  const display = value && value.trim().length > 0 ? value : "—";
  return (
    <div className="surface-card rounded-xl p-5 relative overflow-hidden" data-testid={`metric-${label}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${styles.bar}`} />
      <div className="text-eyebrow text-muted-foreground mb-2.5">{label}</div>
      <div className={`font-display text-[24px] leading-[1.1] num-tabular tracking-tight ${styles.value}`}>
        {display}
      </div>
      {description && (
        <div className="text-[12px] text-muted-foreground mt-2 leading-snug">{description}</div>
      )}
    </div>
  );
}
