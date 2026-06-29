---
name: Finvois ratio percent/fraction normalization
description: How the Ratio Analysis tab decides whether a percent-typed ratio series is in whole-percent or decimal-fraction form, and which ratios are excluded.
---

# Ratio percent vs fraction normalization (display only)

Different DPR documents print profitability/return ratios in different forms: some show
ROCE/ROA as decimal fractions (0.16 = 16%) while GP%/NP% come as whole percentages
(39.53 = 39.53%). The extraction layer records values **exactly as printed** (no
conversion) — the prompt was deliberately changed to stop forcing a "percentages" form,
because that contradicted the "exactly as printed" rule and produced inconsistent output.

Display normalization lives only in the dashboard (`pctScale`/`scaleArr` in the ratios
section of Dashboard.tsx): a series is treated as fractions and multiplied by 100 **only
when every finite value is within [-1, 1]**; if any value exceeds 1 the series is assumed
already in whole-percent form and left unscaled.

**Why:** the fraction-vs-percent boundary is fundamentally ambiguous (0.8 could mean 0.8%
or 80%). The strict "all values ≤ 1" rule was chosen over a looser `max <= 1.5` threshold
to shrink the false-positive window for genuine low-percentage series. Stored data is
never mutated, preserving the "never recalculate extracted values" rule.

**How to apply:** only the four percent-typed series get scaled — grossProfitMargin,
netProfitMargin, roce, returnOnAssets. proprietaryRatio is a genuine plain ratio
(e.g. 0.17, 1.23, 8.71) and must NOT be scaled. DSCR, currentRatio, ICR, tolTw,
debtorsTurnover, collection days are plain numbers, also unscaled.
