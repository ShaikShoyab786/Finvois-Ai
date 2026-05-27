interface KpiTileProps {
  label: string;
  value: string | null | undefined;
  variant?: "glass" | "card";
}

/**
 * Premium KPI tile used in the hero (glass on dark) and section pages (card on light).
 * Display rules:
 *   - Label: small uppercase eyebrow
 *   - Value: large serif display, tabular numerals, ₹-prefix preserved if present
 */
export function KpiTile({ label, value, variant = "glass" }: KpiTileProps) {
  const display = value && value.trim().length > 0 ? value : "—";

  // Auto-shrink long string values so the tile stays single-line
  const isLong = display.length > 12;
  const sizeGlass = isLong ? "text-[20px]" : "text-[28px]";
  const sizeCard = isLong ? "text-[18px]" : "text-[26px]";

  if (variant === "glass") {
    return (
      <div className="bg-glass-tile rounded-xl px-6 py-5 group transition-all hover:bg-white/[0.09]" data-testid={`kpi-${label}`}>
        <div className="text-eyebrow text-white/55 mb-3">{label}</div>
        <div className={`font-display ${sizeGlass} leading-[1.15] text-white num-tabular tracking-tight`}>
          {display}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-xl px-6 py-5" data-testid={`kpi-${label}`}>
      <div className="text-eyebrow text-muted-foreground mb-3">{label}</div>
      <div className={`font-display ${sizeCard} leading-[1.15] text-foreground num-tabular tracking-tight`}>
        {display}
      </div>
    </div>
  );
}
