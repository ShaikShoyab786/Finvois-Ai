---
name: Finvois DPR dashboard computation strategy
description: Which DPR dashboard sections are computed client-side vs extracted, and a key DPR data quirk.
---

# Finvois DPR dashboard: client-side vs extracted

The Finvois dashboard (artifacts/finvois/src/pages/Dashboard.tsx) renders financial analysis tabs from a report's extractedData.

## Decision: compute derived analyses client-side
Loan Schedule DSCR, Altman Z-Score, and Break-Even & Sensitivity are computed CLIENT-SIDE from already-extracted core financials (plAccount, balanceSheet, ratioAnalysis), NOT extracted by Claude.

**Why:** the LLM extraction of these derived tables was unreliable/redundant — the inputs needed are already extracted as core financials, so deriving them in the UI is deterministic and consistent. Only genuinely report-specific raw inputs are extracted.

**How to apply:** when adding/fixing these tabs, change the formula in Dashboard.tsx — do NOT add LLM extraction rules for them. The supplemental extraction pass extracts ONLY `mpbfSchedule` (raw/WIP/FG stock, wcLimitSanctioned) and `productionSeries` (quantityKg, sellingPricePerKg, installedCapacityKg).

## DPR data quirk: RM/WIP/FG inventory split usually absent
These DPR PDFs typically state working capital only via the "Total Current Assets Method" — they do NOT break inventory into raw material / WIP / finished goods. So `mpbfSchedule` RM/WIP/FG fields are genuinely NULL for most reports (verified against raw_text), not an extraction bug.

**How to apply:** MPBF and BEP sections must degrade gracefully when these are null — show a single Inventory line (not RM/WIP/FG split rows) and hide per-KG BEP/capacity metrics when productionSeries is absent (e.g. reports 7/8). Don't treat null RM/WIP/FG as a failure to fix.

## Verified calibration (report 6 = SIMHADRI INFRA METALS)
Altman Z: 1.54 (distress) → 8.04 (safe) across years; A=NWC/TA, B=netProfit/TA, C=ebit/TA, D=netCapital/(TA−netCapital), E=revenue/TA, Z=1.2A+1.4B+3.3C+0.6D+1.0E.
BEP year1 ≈ 29,787 KGs, MOS 17.98%. MPBF KPIs ₹13.50L / 6.15L / 5.02L.
