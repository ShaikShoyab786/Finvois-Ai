import { GOLD } from "@/lib/chartStyle";

export type GaugeBand = {
  /** Upper bound of the band (exclusive of next band's start). */
  to: number;
  /** Tailwind background class for the band fill. */
  bg: string;
  /** Optional short label shown below the band tick. */
  label?: string;
};

/**
 * A horizontal banded gauge used in the Financial Evaluation section to
 * show whether a single value lands inside acceptable thresholds —
 * IRR vs WACC, Altman Z-Score distress bands, Avg DSCR vs banking floor.
 *
 * The needle is clamped to [min, max] so absurd values still render
 * (against the edge) instead of disappearing.
 */
export function ThresholdGauge({
  label,
  value,
  suffix = "",
  min,
  max,
  bands,
  benchmarkLabel,
  invertGood = false,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  min: number;
  max: number;
  bands: GaugeBand[];
  benchmarkLabel?: string;
  /** When true, lower values are "good" (e.g. distress scores). Used only
   *  for the verdict pill, not the band rendering. */
  invertGood?: boolean;
}) {
  const range = max - min;
  if (range <= 0) return null;
  const clamped = value == null ? null : Math.max(min, Math.min(max, value));
  const pctOf = (v: number) => ((v - min) / range) * 100;

  // Pre-compute band rectangles: [bandStart, bandEnd] → [%left, %width]
  const segments: { left: number; width: number; bg: string }[] = [];
  let cursor = min;
  for (const b of bands) {
    const left = pctOf(cursor);
    const right = pctOf(Math.min(b.to, max));
    if (right > left) segments.push({ left, width: right - left, bg: b.bg });
    cursor = b.to;
    if (cursor >= max) break;
  }

  // Verdict pill: which band does value fall into?
  // We use strict less-than for band assignment so that a value exactly on
  // a boundary (e.g. DSCR 1.5, Altman 3.0) falls into the HIGHER band — this
  // matches the displayed benchmark semantics ("1.5×+ is what most banks
  // underwrite to") rather than penalising boundary-equal values as borderline.
  let verdictBg = "bg-muted/40 text-muted-foreground";
  let verdictText = "—";
  if (value != null) {
    let i = bands.findIndex((b) => value < b.to);
    if (i === -1) i = bands.length - 1;
    const last = bands.length - 1;
    const isExtremeLow = i === 0;
    const isExtremeHigh = i === last;
    if (bands.length >= 3 && !isExtremeLow && !isExtremeHigh) {
      verdictBg = "bg-amber-50 text-amber-700";
      verdictText = "Borderline";
    } else if ((isExtremeLow && invertGood) || (isExtremeHigh && !invertGood)) {
      verdictBg = "bg-emerald-50 text-emerald-700";
      verdictText = "On target";
    } else {
      // Direction-aware label so high-side breaches on inverted scales
      // (where higher = worse) read correctly, not as "Below".
      verdictBg = "bg-rose-50 text-rose-700";
      verdictText = isExtremeHigh ? "Above target" : "Below";
    }
  }

  const fmtTick = (n: number) => `${n}${suffix}`;

  return (
    <div className="surface-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="text-eyebrow text-muted-foreground">{label}</div>
        <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${verdictBg}`}>
          {verdictText}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <div className="font-display text-[28px] leading-none text-foreground num-tabular">
          {value != null ? `${value.toFixed(2)}${suffix}` : "—"}
        </div>
      </div>

      {/* Banded track */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted/30">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 ${s.bg}`}
            style={{ left: `${s.left}%`, width: `${s.width}%` }}
          />
        ))}
        {/* Needle */}
        {clamped != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-[18px] bg-foreground rounded-full"
            style={{ left: `calc(${pctOf(clamped)}% - 1px)` }}
            aria-label={`Value ${value}`}
          />
        )}
      </div>

      {/* Tick labels at band boundaries (skip the trailing max for cleanliness) */}
      <div className="relative h-4 mt-1.5">
        <span className="absolute left-0 text-[10px] text-muted-foreground" style={{ transform: "translateX(0)" }}>
          {fmtTick(min)}
        </span>
        {bands.slice(0, -1).map((b, i) => (
          <span
            key={i}
            className="absolute text-[10px] text-muted-foreground"
            style={{ left: `${pctOf(b.to)}%`, transform: "translateX(-50%)" }}
          >
            {b.label ?? fmtTick(b.to)}
          </span>
        ))}
        <span className="absolute right-0 text-[10px] text-muted-foreground" style={{ transform: "translateX(0)" }}>
          {fmtTick(max)}
        </span>
      </div>

      {benchmarkLabel && (
        <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border">
          {benchmarkLabel}
        </div>
      )}
    </div>
  );
}

/** Parse the first numeric token out of a free-form string. Returns null if
 *  no number is found. Tolerant of currency, percent, units, commas. */
export function parseNumeric(s: string | null | undefined): number | null {
  if (typeof s !== "string") return null;
  const cleaned = s.replace(/,/g, "");
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return isFinite(n) ? n : null;
}

// Re-export GOLD so consumers building gauge bands have a consistent palette
// without an extra import.
export const GAUGE_GOLD = GOLD;
