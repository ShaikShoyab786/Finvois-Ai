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
  ReferenceLine,
} from "recharts";
import { NAVY, GOLD, ROSE_SOFT, MUTED_GRID, axisTick, tooltipStyle } from "@/lib/chartStyle";

/**
 * The banker's master view: stacks the loan's annual EMI burden against the
 * operating cash actually available, and overlays the DSCR ratio with the
 * 1.2× banking-floor reference. Answers: "will operating cash service the
 * debt in every single year of the tenure?"
 */
export function DscrAmortizationChart({ loan, cf, ra }: { loan: any; cf: any; ra: any }) {
  if (!loan?.schedule?.length) return null;

  const cfMap: Record<string, number> = {};
  cf?.years?.forEach((y: any, i: number) => {
    const v = cf.operatingCashFlow?.[i];
    if (typeof v === "number" && isFinite(v)) cfMap[String(y)] = v;
  });
  const raMap: Record<string, number> = {};
  ra?.years?.forEach((y: any, i: number) => {
    const v = ra.dscr?.[i];
    if (typeof v === "number" && isFinite(v)) raMap[String(y)] = v;
  });

  const data = loan.schedule.map((r: any) => {
    const emi =
      (typeof r.principal === "number" ? r.principal : 0) +
      (typeof r.interest === "number" ? r.interest : 0);
    const yk = String(r.year);
    return {
      year: yk,
      EMI: emi || null,
      "Operating Cash": cfMap[yk] ?? null,
      DSCR: raMap[yk] ?? null,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={MUTED_GRID} />
        <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          domain={[0, "auto"]}
          tickFormatter={(v) => `${v.toFixed(1)}×`}
        />
        <RechartsTooltip
          contentStyle={tooltipStyle}
          formatter={(v: number, name: string) =>
            name === "DSCR" ? [`${v.toFixed(2)}×`, name] : [`₹${v.toFixed(2)}L`, name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
        <Bar yAxisId="left" dataKey="EMI" fill={ROSE_SOFT} maxBarSize={26} radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="Operating Cash"
          stroke={NAVY}
          strokeWidth={2.5}
          dot={{ r: 4, fill: NAVY }}
          connectNulls={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="DSCR"
          stroke={GOLD}
          strokeWidth={2.5}
          dot={{ r: 4, fill: GOLD }}
          strokeDasharray="4 3"
          connectNulls={false}
        />
        <ReferenceLine
          yAxisId="right"
          y={1.2}
          stroke="hsl(0 50% 60%)"
          strokeDasharray="3 3"
          label={{
            value: "1.2× banking floor",
            fontSize: 10,
            fill: "hsl(218 15% 50%)",
            position: "insideTopRight",
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
