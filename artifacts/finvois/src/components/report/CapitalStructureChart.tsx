import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { GOLD, GOLD_SOFT, SAND, MUTED_GRID, axisTick, tooltipStyle } from "@/lib/chartStyle";

/**
 * 100%-stacked area showing how the funding mix
 * (Equity / Long-term Debt / Short-term Debt) evolves year over year.
 * Answers: "does the project deleverage as it pays down debt?"
 */
export function CapitalStructureChart({ bs }: { bs: any }) {
  if (!bs?.years?.length) return null;
  const data = bs.years.map((y: string, i: number) => {
    const e = bs.equity?.[i] ?? 0;
    const ltl = bs.longTermLiabilities?.[i] ?? 0;
    const cl = bs.currentLiabilities?.[i] ?? 0;
    const total = e + ltl + cl;
    return {
      year: y,
      Equity: e,
      "Long-term Debt": ltl,
      "Short-term Debt": cl,
      _total: total,
    };
  });
  // Only render when at least one year has a positive total funding base.
  if (!data.some((d: { _total: number }) => d._total > 0)) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} stackOffset="expand" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={MUTED_GRID} />
        <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <RechartsTooltip
          contentStyle={tooltipStyle}
          formatter={(v: number, name: string, p: any) => {
            const total: number = p?.payload?._total || 0;
            const pct = total > 0 ? (v / total) * 100 : 0;
            return [`₹${v.toFixed(2)}L (${pct.toFixed(0)}%)`, name];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
        <Area type="monotone" dataKey="Short-term Debt" stackId="1" stroke={SAND} fill={SAND} fillOpacity={0.85} />
        <Area type="monotone" dataKey="Long-term Debt" stackId="1" stroke={GOLD_SOFT} fill={GOLD_SOFT} fillOpacity={0.9} />
        <Area type="monotone" dataKey="Equity" stackId="1" stroke={GOLD} fill={GOLD} fillOpacity={0.9} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
