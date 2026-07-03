---
name: Finvois PDF export (landscape + download)
description: How the dashboard exports to PDF — A4 landscape, client-side Download PDF path, and wide-table fit rules.
---

# Finvois dashboard PDF export

The Export screen renders the **real** dashboard DOM, not a stub. `PrintableReport`
(exported from `Dashboard.tsx`) stacks every section; `Export.tsx` renders it
VISIBLY (so Recharts `ResponsiveContainer` can measure). The whole export is
**A4 landscape** — the on-screen paper shell is 1122px wide (297mm @96dpi) so
the preview matches the PDF proportions, and chart grids render 2-up naturally.

## Two export paths
1. **Download PDF (primary):** client-side `generatePdf.ts` using
   `html2canvas-pro` + `jspdf`. **Must be html2canvas-pro, not classic
   html2canvas** — Tailwind v4 emits oklch colors which classic html2canvas
   cannot parse. Each `.print-section` is captured ONCE, then sliced into pages
   at block boundaries (blocks never split; heading blocks kept with following
   content; oversized blocks scaled to fit; capture scale adaptively reduced so
   canvas area stays under ~16M px for Safari). A `pdf-capture` class is toggled
   on `.print-root` during capture to mirror print visibility (`.print-only`
   shown, `.no-print` hidden, overflow visible).
   **Why one-capture-per-section:** html2canvas clones the entire document per
   call — capturing per block (~40 calls) is so slow it times out; per section
   (~13 calls) is fast.
2. **Print (secondary):** `window.print()` with the `@media print` block in
   `index.css` (`@page` A4 landscape, `break-before: page` per section).

## Pagination rules (both paths)
- Every section starts a fresh page; cards/charts/tables never split
  (`break-inside: avoid` + block-based slicing).
- Headings must never be stranded: print CSS uses `h1-h3 { break-after: avoid }`
  and `.print-keep` wrappers (Product Portfolio, Implementation Timeline);
  the download path uses a keep-with-next lookahead.

## Wide-table fit strategy (Loan Schedule & MPBF)
- **Year-as-COLUMN tables (MPBF / any `MatrixTable`):** pass `printChunkSize`
  (currently 9 — tuned for **landscape** width). When `years.length >
  printChunkSize`, screen keeps the scrollable table (`.no-print`) and export
  gets `.print-only` chunks repeating the "Particulars" column.
- **Year-as-ROW tables (Loan Schedule, ~9 metric cols):** fits landscape
  directly; header wrap (`white-space: normal`) + padding compaction via
  `.print-landscape` (now just a "wide table" compaction marker, no named page).

**How to apply:** any new wide multi-year matrix should go through `MatrixTable`
with a landscape-safe `printChunkSize`; if page geometry changes again, re-tune
chunk size and the 1122px shell width together.
