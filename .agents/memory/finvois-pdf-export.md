---
name: Finvois PDF export (print path)
description: How the dashboard exports to a print-ready PDF and how wide tables are made to fit deterministically.
---

# Finvois dashboard PDF export

The Export screen prints the **real** dashboard DOM, not a stub. `PrintableReport`
(exported from `Dashboard.tsx`) stacks every section reusing the file's internal
section components; `Export.tsx` renders it VISIBLY (so Recharts
`ResponsiveContainer` can measure) and calls `window.print()`. Print layout is
driven entirely by the `@media print` block in `index.css`.

## Wide-table fit strategy (Loan Schedule & MPBF)
**Rule:** landscape first, column-split second; never rely *solely* on named
`@page landscape` because some print engines ignore it.

- **Year-as-COLUMN tables (MPBF, and any `MatrixTable`):** pass `printChunkSize`.
  When `years.length > printChunkSize`, the screen keeps the scrollable table
  (`.no-print`) and the PDF gets a `.print-only` block of chunks — each chunk
  repeats the first "Particulars" label column and starts a new page
  (`.matrix-chunk` / `.matrix-chunk-break`). Chunk size is tuned to fit A4
  **portrait** so output is readable even if landscape is dropped.
- **Year-as-ROW tables (Loan Schedule — years are rows, ~9 fixed metric
  columns):** column-splitting of "year columns" does NOT apply. It uses
  landscape + `.print-landscape thead th { white-space: normal }` (header wrap)
  + font/padding compaction to fit.

**Why:** banker-grade PDFs must stay readable; the task explicitly required a
column-split fallback when landscape is insufficient. **How to apply:** any new
wide multi-year matrix added to the export should go through `MatrixTable` with a
portrait-safe `printChunkSize`, not just rely on `.print-landscape`.
