// Shared Recharts palette and styling primitives.
// Single source of truth so every chart looks coherent across the report.

export const NAVY = "hsl(221 83% 53%)";       // primary royal blue
export const NAVY_LIGHT = "hsl(199 89% 48%)"; // sky blue
export const GOLD = "hsl(32 90% 52%)";        // orange accent
export const GOLD_SOFT = "hsl(32 85% 65%)";
export const SAND = "hsl(262 45% 78%)";       // light purple
export const EMERALD = "hsl(158 64% 40%)";
export const ROSE = "hsl(0 72% 51%)";
export const ROSE_SOFT = "hsl(0 72% 68%)";
export const SLATE = "hsl(215 16% 47%)";
export const MUTED_GRID = "hsl(220 16% 90%)";

export const tooltipStyle = {
  background: "white",
  border: "1px solid hsl(220 16% 90%)",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 8px 24px hsl(222 47% 11% / 0.10)",
  fontSize: 12,
};

export const axisTick = { fill: SLATE, fontSize: 11 };
