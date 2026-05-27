/**
 * Deterministic, AI-style insight generators.
 *
 * These functions read extracted DPR data and emit short, intelligent
 * commentary used as caption blocks below each chart/table. The phrasing
 * is intentionally crafted to feel like an analyst's observation, not
 * generic stats. All functions tolerate missing/sparse data and return
 * null when nothing meaningful can be said.
 */

const nz = (v: number | null | undefined): number | null =>
  typeof v === "number" && isFinite(v) ? v : null;

const safeArr = (arr?: (number | null)[] | null): number[] =>
  (arr || []).map((v) => (typeof v === "number" && isFinite(v) ? v : 0));

const firstNonZero = (arr: number[]): number | null => {
  for (const v of arr) if (v !== 0) return v;
  return null;
};

const lastNonZero = (arr: number[]): number | null => {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== 0) return arr[i];
  return null;
};

const fmtMultiple = (n: number): string =>
  n >= 10 ? `${n.toFixed(0)}×` : `${n.toFixed(1)}×`;

const fmtPct = (n: number): string => `${n.toFixed(1)}%`;

// ─── P&L ──────────────────────────────────────────────
export function insightPL(pl?: {
  years?: string[];
  revenue?: (number | null)[];
  netProfit?: (number | null)[];
  grossProfit?: (number | null)[];
}): string | null {
  if (!pl?.years?.length) return null;
  const years = pl.years;
  const rev = safeArr(pl.revenue);
  const np = safeArr(pl.netProfit);
  const first = firstNonZero(rev);
  const last = lastNonZero(rev);

  const parts: string[] = [];
  if (first && last && first > 0) {
    const mult = last / first;
    parts.push(
      `Revenue scales from the opening year to ${years[years.length - 1]} by ${fmtMultiple(mult)}`
    );
  }

  // Find first profitable year
  const profitYearIdx = np.findIndex((v) => v > 0);
  if (profitYearIdx >= 0 && profitYearIdx < years.length) {
    if (profitYearIdx === 0) {
      parts.push("with net profit positive from the outset");
    } else {
      parts.push(`with the project turning net-profitable in ${years[profitYearIdx]}`);
    }
  }

  // Avg net margin
  const margins = rev.map((r, i) => (r > 0 && np[i] != null ? (np[i] / r) * 100 : null)).filter((v): v is number => v !== null);
  if (margins.length) {
    const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
    if (avg > 0) parts.push(`averaging a ${fmtPct(avg)} net margin`);
  }

  if (!parts.length) return null;
  return parts.join(", ") + ".";
}

// ─── Balance Sheet ───────────────────────────────────
export function insightBalanceSheet(bs?: {
  years?: string[];
  currentAssets?: (number | null)[];
  fixedAssets?: (number | null)[];
  equity?: (number | null)[];
  longTermLiabilities?: (number | null)[];
}): string | null {
  if (!bs?.years?.length) return null;
  const years = bs.years;
  const totalAssets = bs.years.map((_, i) =>
    (nz(bs.currentAssets?.[i]) || 0) + (nz(bs.fixedAssets?.[i]) || 0)
  );
  const eq = safeArr(bs.equity);
  const debt = safeArr(bs.longTermLiabilities);

  const parts: string[] = [];

  const firstA = firstNonZero(totalAssets);
  const lastA = lastNonZero(totalAssets);
  if (firstA && lastA && firstA > 0) {
    parts.push(
      `Asset base grows ${fmtMultiple(lastA / firstA)} from ${years[0]} to ${years[years.length - 1]}`
    );
  }

  // Equity vs debt shift
  const lastEq = lastNonZero(eq);
  const lastDebt = lastNonZero(debt);
  if (lastEq && lastDebt) {
    const ratio = lastEq / (lastEq + lastDebt);
    if (ratio > 0.6)
      parts.push(`with the closing balance sheet equity-dominant (${fmtPct(ratio * 100)} equity share)`);
    else if (ratio < 0.3)
      parts.push(`with the project carrying a debt-heavy capital structure (${fmtPct((1 - ratio) * 100)} debt share)`);
    else parts.push(`with a balanced ${fmtPct(ratio * 100)}/${fmtPct((1 - ratio) * 100)} equity-to-debt mix at close`);
  }

  if (!parts.length) return null;
  return parts.join(", ") + ".";
}

// ─── Cash Flow ───────────────────────────────────────
export function insightCashFlow(cf?: {
  years?: string[];
  operatingCashFlow?: (number | null)[];
  netCashFlow?: (number | null)[];
}): string | null {
  if (!cf?.years?.length) return null;
  const years = cf.years;
  const op = safeArr(cf.operatingCashFlow);
  const net = safeArr(cf.netCashFlow);

  const parts: string[] = [];
  const firstPosOp = op.findIndex((v) => v > 0);
  if (firstPosOp === 0) parts.push("Operating cash is positive from the first year");
  else if (firstPosOp > 0 && firstPosOp < years.length)
    parts.push(`Operating cash turns positive in ${years[firstPosOp]}`);

  const totalNet = net.reduce((a, b) => a + b, 0);
  if (totalNet > 0) parts.push(`with cumulative net cash flow of ₹${totalNet.toFixed(2)} Lacs across the window`);
  else if (totalNet < 0) parts.push(`with cumulative net cash flow of ₹${totalNet.toFixed(2)} Lacs (deficit)`);

  if (!parts.length) return null;
  return parts.join(", ") + ".";
}

// ─── Ratios ─────────────────────────────────────────
export function insightRatios(ra?: {
  years?: string[];
  dscr?: (number | null)[];
  currentRatio?: (number | null)[];
  debtEquityRatio?: (number | null)[];
  netProfitMargin?: (number | null)[];
}): string | null {
  if (!ra?.years?.length) return null;
  const dscr = safeArr(ra.dscr);
  const cr = safeArr(ra.currentRatio);
  const parts: string[] = [];

  const avgDscr = dscr.filter((v) => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0);
  if (avgDscr > 0) {
    if (avgDscr >= 1.5)
      parts.push(`Average DSCR of ${avgDscr.toFixed(2)}× comfortably clears the 1.5× banking benchmark`);
    else if (avgDscr >= 1.2) parts.push(`Average DSCR of ${avgDscr.toFixed(2)}× meets the minimum 1.2× lender threshold`);
    else parts.push(`Average DSCR of ${avgDscr.toFixed(2)}× falls below the 1.2× lender threshold`);
  }

  const avgCr = cr.filter((v) => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0);
  if (avgCr > 0) {
    if (avgCr >= 1.33) parts.push(`with current ratio averaging ${avgCr.toFixed(2)} (healthy liquidity)`);
    else parts.push(`with current ratio averaging ${avgCr.toFixed(2)}`);
  }

  if (!parts.length) return null;
  return parts.join(", ") + ".";
}

// ─── Loan ─────────────────────────────────────────────
export function insightLoan(loan?: {
  tenure?: string | null;
  termLoanAmount?: string | null;
  schedule?: { interest?: number | null; totalEmi?: number | null }[];
}): string | null {
  if (!loan?.schedule?.length) return null;
  const totalInterest = loan.schedule.reduce((s, r) => s + (r.interest || 0), 0);
  const totalEmi = loan.schedule.reduce((s, r) => s + (r.totalEmi || 0), 0);
  const parts: string[] = [];
  if (totalInterest > 0)
    parts.push(`Total interest outflow of ₹${totalInterest.toFixed(2)} Lacs across the tenure`);
  if (totalEmi > 0) parts.push(`with total servicing of ₹${totalEmi.toFixed(2)} Lacs`);
  if (loan.tenure) parts.push(`over a ${loan.tenure} window`);
  if (!parts.length) return null;
  return parts.join(", ") + ".";
}

// ─── Helpers for P&L summary metrics ────────────────
export function plLatestMetrics(pl?: {
  years?: string[];
  revenue?: (number | null)[];
  netProfit?: (number | null)[];
  grossProfit?: (number | null)[];
}): { revenue: number | null; netProfit: number | null; grossMargin: number | null; netMargin: number | null } {
  if (!pl?.years?.length) return { revenue: null, netProfit: null, grossMargin: null, netMargin: null };
  const idx = pl.years.length - 1;
  const rev = nz(pl.revenue?.[idx]);
  const np = nz(pl.netProfit?.[idx]);
  const gp = nz(pl.grossProfit?.[idx]);
  return {
    revenue: rev,
    netProfit: np,
    grossMargin: rev != null && rev !== 0 && gp != null ? (gp / rev) * 100 : null,
    netMargin: rev != null && rev !== 0 && np != null ? (np / rev) * 100 : null,
  };
}

/** Mean of all finite, non-null values. Returns null when no valid numbers. */
export function meanFinite(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
