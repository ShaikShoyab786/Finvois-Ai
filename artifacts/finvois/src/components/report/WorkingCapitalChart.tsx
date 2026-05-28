import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { NAVY, GOLD_SOFT, EMERALD, MUTED_GRID, axisTick, tooltipStyle } from "@/lib/chartStyle";

/**
 * Working Capital = Current Assets − Current Liabilities. Renders both
 * components as bars per year with the WC gap as an overlaid line on a
 * secondary axis. Answers: "is the business solvent month-to-month?"
 */
export function WorkingCapitalChart({ bs }: { bs: any }) {
  if (!bs?.years?.length) return null;
  const data = bs.years.map((y: string, i: number) => {
    const ca = bs.currentAssets?.[i];
    const cl = bs.currentLiabilities?.[i];
    return {
      year: y,
      "Current Assets": typeof ca === "number" ? ca : null,
      "Current Liab.": typeof cl === "number" ? cl : null,
      "Working Capital":
        typeof ca === "number" && typeof cl === "number" ? ca - cl : null,
    };
  });

  // Only render if at least one row has meaningful pairs.
  const hasData = data.some(
    (d: { "Current Assets": number | null; "Current Liab.": number | null }) =>
      d["Current Assets"] != null && d["Current Liab."] != null,
  );
  if (!hasData) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={MUTED_GRID} />
        <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
        <RechartsTooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
        <Bar yAxisId="left" dataKey="Current Assets" fill={NAVY} maxBarSize={26} radius={[3, 3, 0, 0]} />
        <Bar yAxisId="left" dataKey="Current Liab." fill={GOLD_SOFT} maxBarSize={26} radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="Working Capital"
          stroke={EMERALD}
          strokeWidth={2.5}
          dot={{ r: 4, fill: EMERALD }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
