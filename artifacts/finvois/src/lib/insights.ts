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

// ─── Financial Dashboard synthesis ─────────────────────
/**
 * A cross-statement, banker-style snapshot. Pulls signals from P&L,
 * Cash Flow, Ratios and Evaluation to assemble a single paragraph
 * verdict tying them together.
 */
export function insightFinancialSnapshot(ed: any): string | null {
  if (!ed) return null;
  const parts: string[] = [];

  const pl = ed?.plAccount;
  if (pl?.years?.length) {
    const rev = safeArr(pl.revenue);
    const first = firstNonZero(rev);
    const last = lastNonZero(rev);
    if (first && last && first > 0) {
      parts.push(`Revenue scales ${fmtMultiple(last / first)} across the projection window`);
    }
  }

  const ra = ed?.ratioAnalysis;
  if (ra?.years?.length) {
    const dscr = meanFinite(ra.dscr || []);
    if (dscr != null) {
      if (dscr >= 1.5) parts.push(`with an average DSCR of ${dscr.toFixed(2)}× (above the 1.5× banking benchmark)`);
      else if (dscr >= 1.2) parts.push(`with an average DSCR of ${dscr.toFixed(2)}× (meeting the 1.2× minimum)`);
      else parts.push(`with a thin average DSCR of ${dscr.toFixed(2)}× (below the 1.2× lender threshold)`);
    }
  }

  const cf = ed?.cashFlow;
  if (cf?.years?.length) {
    const op = safeArr(cf.operatingCashFlow);
    const firstPos = op.findIndex((v) => v > 0);
    if (firstPos === 0) parts.push("Operating cash is positive from year one");
    else if (firstPos > 0) parts.push(`Operating cash turns positive in ${cf.years[firstPos]}`);
  }

  const fe = ed?.financialEvaluation;
  if (fe?.irr) parts.push(`The project clocks an IRR of ${fe.irr}`);
  if (fe?.simplePaybackPeriod) parts.push(`with a simple payback of ${fe.simplePaybackPeriod}`);

  if (!parts.length) return null;
  return parts.join(", ") + ".";
}

// ─── Relationship-visualization insights (Phase 3b) ─────

/** Where does each rupee of revenue go? */
export function insightWaterfall(pl: any): string | null {
  if (!pl?.revenue?.length) return null;
  const i = pl.revenue.length - 1;
  const r = pl.revenue[i];
  const gp = pl.grossProfit?.[i];
  const np = pl.netProfit?.[i];
  if (typeof r !== "number" || r === 0 || typeof np !== "number") return null;
  const netPct = (np / r) * 100;
  const parts: string[] = [];
  if (typeof gp === "number") {
    const grossPct = (gp / r) * 100;
    parts.push(`${grossPct.toFixed(0)}% of revenue survives direct costs`);
    parts.push(`but only ${netPct.toFixed(0)}% reaches the bottom line`);
    const absorbed = grossPct - netPct;
    if (absorbed > 0) {
      parts.push(`operating costs, depreciation and interest absorb ${absorbed.toFixed(0)} percentage points along the way`);
    }
  } else {
    parts.push(`${netPct.toFixed(0)}% of revenue reaches the bottom line`);
  }
  return parts.join(", ") + ".";
}

/** Short-term solvency reading from current assets and liabilities. */
export function insightWorkingCapital(bs: any): string | null {
  if (!bs?.years?.length) return null;
  const i = bs.years.length - 1;
  const ca = bs.currentAssets?.[i];
  const cl = bs.currentLiabilities?.[i];
  if (typeof ca !== "number" || typeof cl !== "number" || cl === 0) return null;
  const wc = ca - cl;
  const ratio = ca / cl;
  const wcStr = `₹${wc.toFixed(2)}L`;
  const rStr = `${ratio.toFixed(2)}×`;
  if (ratio >= 2) return `Working capital cushion of ${wcStr} (current ratio ${rStr}) — comfortably solvent short-term.`;
  if (ratio >= 1.33) return `Working capital of ${wcStr} (current ratio ${rStr}) — healthy short-term liquidity.`;
  if (ratio >= 1) return `Thin working capital of ${wcStr} (current ratio ${rStr}) — obligations covered but with little buffer.`;
  return `Negative working capital of ${wcStr} (current ratio ${rStr}) — short-term liabilities exceed current assets.`;
}

/** Does the funding mix shift toward equity (deleveraging) over time? */
export function insightCapitalStructure(bs: any): string | null {
  if (!bs?.years?.length || bs.years.length < 2) return null;
  const calc = (i: number) => {
    const e = bs.equity?.[i];
    const ltl = bs.longTermLiabilities?.[i];
    const cl = bs.currentLiabilities?.[i];
    const eq = typeof e === "number" ? e : 0;
    const lt = typeof ltl === "number" ? ltl : 0;
    const ct = typeof cl === "number" ? cl : 0;
    const total = eq + lt + ct;
    if (total === 0) return null;
    return { equityPct: (eq / total) * 100, debtPct: ((lt + ct) / total) * 100 };
  };
  const first = calc(0);
  const last = calc(bs.years.length - 1);
  if (!first || !last) return null;
  const shift = last.equityPct - first.equityPct;
  if (shift > 5)
    return `Equity share rises from ${first.equityPct.toFixed(0)}% to ${last.equityPct.toFixed(0)}% — the project deleverages as debt is repaid.`;
  if (shift < -5)
    return `Equity share falls from ${first.equityPct.toFixed(0)}% to ${last.equityPct.toFixed(0)}% — leverage increases over the projection window.`;
  return `Capital mix stays broadly stable: equity ${last.equityPct.toFixed(0)}%, debt ${last.debtPct.toFixed(0)}%.`;
}

/** Will operating cash cover EMI in every year of the loan tenure? */
export function insightDscrAmortization(_loan: any, _cf: any, ra: any): string | null {
  const dscr = ra?.dscr;
  if (!Array.isArray(dscr) || !dscr.length) return null;
  const valid = dscr.filter((v: any) => typeof v === "number" && isFinite(v)) as number[];
  if (!valid.length) return null;
  const min = Math.min(...valid);
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (min >= 1.5)
    return `DSCR never dips below ${min.toFixed(2)}× and averages ${avg.toFixed(2)}× — operating cash comfortably covers EMI throughout the tenure.`;
  if (min >= 1.2)
    return `DSCR averages ${avg.toFixed(2)}× with a low point of ${min.toFixed(2)}× — coverage meets the 1.2× banking minimum in every year.`;
  if (min >= 1)
    return `DSCR averages ${avg.toFixed(2)}× but dips to ${min.toFixed(2)}× — coverage gets thin in at least one year of the tenure.`;
  return `DSCR falls to ${min.toFixed(2)}× in at least one year — operating cash is insufficient to service debt without external support.`;
}
