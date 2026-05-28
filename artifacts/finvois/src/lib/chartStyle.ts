// Shared Recharts palette and styling primitives.
// Single source of truth so every chart looks coherent across the report.

export const NAVY = "hsl(218 55% 14%)";
export const NAVY_LIGHT = "hsl(218 30% 45%)";
export const GOLD = "hsl(38 55% 58%)";
export const GOLD_SOFT = "hsl(38 50% 65%)";
export const SAND = "hsl(38 40% 78%)";
export const EMERALD = "hsl(158 55% 40%)";
export const ROSE = "hsl(0 60% 50%)";
export const ROSE_SOFT = "hsl(0 45% 70%)";
export const SLATE = "hsl(218 15% 35%)";
export const MUTED_GRID = "hsl(35 18% 90%)";

export const tooltipStyle = {
  background: "white",
  border: "1px solid hsl(218 20% 88%)",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 8px 24px hsl(218 30% 14% / 0.10)",
  fontSize: 12,
};

export const axisTick = { fill: SLATE, fontSize: 11 };
