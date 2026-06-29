---
name: Finvois extracted-data units are mixed
description: P&L / cash-flow / balance line items are in raw rupees while projectCost & financialSummary are in lakhs
---

# Finvois extracted DPR data uses mixed units

Within a single report's `extractedData`:

- `plAccount` (revenue, grossProfit, netProfit, …), `cashFlow`, and balance-sheet
  line items are extracted in **raw rupees** (e.g. revenue `4330000` = ₹43.3 lakhs).
  `cashFlow` is the full Projected Cash Flow Statement (totalInflows, totalOutflows,
  grossSurplus, drawings, openingBalance, closingBalance, plus per-line inflow/outflow
  items); legacy `operatingCashFlow`/`netCashFlow` kept for the overview + DSCR chart,
  with `netCashFlow == grossSurplus`. All in raw rupees.
- `projectCost.totalCost` and `financialSummary` figures (termLoan, equityCapital,
  totalProjectCost) are already in **lakhs** (e.g. `10.25` = ₹10.25 lakhs).

**Why:** The extraction prompt captures statement line items at their source
(rupees) but summarises project financing in lakhs. There is no unit metadata
field — the unit is implicit per section.

**How to apply:** When charting rupee-denominated series in lakhs, convert
(divide by 1e5). The dashboard uses a scale-aware `lakhFormatter(maxAbs)` in
`Dashboard.tsx` that treats `maxAbs >= 1000` as rupees and divides, else assumes
the value is already in lakhs. Never mix a projectCost (lakhs) value into the same
axis as a plAccount (rupees) value without normalising first. A proper fix would
add explicit unit metadata at the extraction/API layer.
