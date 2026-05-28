import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import { NAVY, GOLD, ROSE_SOFT, EMERALD, MUTED_GRID, axisTick, tooltipStyle } from "@/lib/chartStyle";

export type WaterfallStep = {
  name: string;
  type: "total" | "subtotal" | "down" | "up";
  base: number;
  bar: number;
  /** Signed delta: + = deduction, − = addition. For tooltip labels. */
  delta: number;
};

/**
 * Build a profitability-waterfall step list that ALWAYS closes the bridge
 * from Revenue (or Gross Profit) down to Net Profit, even when intermediate
 * fields are missing from the source. Whatever can't be attributed to a
 * named line item is honestly bucketed into a residual "Other & Tax" (or
 * "Other Income" if the residual is negative, i.e. unexpected uplift).
 *
 * Exported separately from the React component so it is unit-testable.
 */
export function buildWaterfallSteps(args: {
  revenue: number;
  grossProfit?: number | null;
  depreciation?: number | null;
  interest?: number | null;
  netProfit: number;
}): WaterfallStep[] {
  const { revenue: R, grossProfit: GP, depreciation: D, interest: I, netProfit: NP } = args;
  const steps: WaterfallStep[] = [];
  let running = 0;

  const total = (name: string, value: number) => {
    steps.push({ name, type: "total", base: 0, bar: value, delta: value });
    running = value;
  };
  const subtotal = (name: string, value: number) => {
    steps.push({ name, type: "subtotal", base: 0, bar: value, delta: value });
    running = value;
  };
  /** Bridge step: `downBy > 0` shows a deduction (down); `< 0` shows an addition (up). */
  const bridge = (downName: string, upName: string, downBy: number) => {
    if (Math.abs(downBy) < 0.005) return; // negligible — skip to avoid pixel-thin slivers
    if (downBy > 0) {
      const after = running - downBy;
      steps.push({ name: downName, type: "down", base: after, bar: downBy, delta: downBy });
      running = after;
    } else {
      const upBy = -downBy;
      steps.push({ name: upName, type: "up", base: running, bar: upBy, delta: -upBy });
      running += upBy;
    }
  };

  total("Revenue", R);

  if (typeof GP === "number") {
    // Direct costs may be negative if GP > R (data inconsistency) — render as
    // upward "− Direct Cost Recovery" rather than silently dropping.
    bridge("− Direct Costs", "+ Direct Cost Recovery", R - GP);
    subtotal("Gross Profit", GP);
  }

  if (typeof D === "number") bridge("− Depreciation", "+ Depreciation Reversal", D);
  if (typeof I === "number") bridge("− Interest", "+ Interest Recovery", I);

  // Close the bridge honestly. Any unexplained gap to NP is a residual bucket
  // (typically Other OpEx + Tax). If residual < 0 the inputs imply uplift — we
  // show it as "Other Income" instead of hiding the inconsistency.
  const residual = running - NP;
  bridge("− Other & Tax", "+ Other Income", residual);

  subtotal("Net Profit", NP);

  return steps;
}

/**
 * Latest-year profitability waterfall. The bridge is guaranteed to land
 * exactly on Net Profit — see `buildWaterfallSteps` for the residual logic.
 */
export function ProfitabilityWaterfall({ pl }: { pl: any }) {
  if (!pl?.revenue?.length) return null;
  const i = pl.revenue.length - 1;
  const R = pl.revenue[i];
  const NP = pl.netProfit?.[i];
  if (typeof R !== "number" || typeof NP !== "number") return null;

  const steps = buildWaterfallSteps({
    revenue: R,
    grossProfit: typeof pl.grossProfit?.[i] === "number" ? pl.grossProfit[i] : null,
    depreciation: typeof pl.depreciation?.[i] === "number" ? pl.depreciation[i] : null,
    interest: typeof pl.interest?.[i] === "number" ? pl.interest[i] : null,
    netProfit: NP,
  });

  const colorOf = (t: WaterfallStep["type"]) =>
    t === "total" ? NAVY : t === "subtotal" ? GOLD : t === "up" ? EMERALD : ROSE_SOFT;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={steps} margin={{ top: 18, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid vertical={false} stroke={MUTED_GRID} />
        <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} />
        <RechartsTooltip
          contentStyle={tooltipStyle}
          formatter={(_v: number, _k: string, p: any) => {
            const s: WaterfallStep = p.payload;
            return [`₹${Math.abs(s.delta).toFixed(2)}L`, s.name];
          }}
          // Hide the transparent base entry from the tooltip
          itemSorter={() => -1}
        />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="bar" stackId="w" maxBarSize={56} radius={[3, 3, 0, 0]}>
          {steps.map((s, idx) => (
            <Cell key={idx} fill={colorOf(s.type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
