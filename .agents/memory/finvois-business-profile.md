---
name: Finvois Business Profile conditional sections
description: Why Business Profile sub-sections render conditionally and can be empty for some reports
---

# Business Profile conditional sections

The Business Profile tab (ProfileSection in `artifacts/finvois/src/pages/Dashboard.tsx`)
renders every sub-block (Project Cost & Finance, Finance Mix, Employment, SWOT,
Implementation Timeline, Product Portfolio) conditionally on the matching field
existing/non-empty on the extracted data.

**Why:** Some DPRs genuinely lack certain tables (e.g. a clinic DPR has no product
portfolio or phased timeline). Empty sections for those reports are correct and
data-driven — do NOT "fix" them by inventing data. `implementationTimeline` and
`productPortfolio` ARE part of the extraction schema/prompt now (added when the
truncation regression was fixed); a blank section means that DPR had no such data,
not a missing schema field.

**How to apply:** SWOT lives ONLY in Business Profile (removed from EvaluationSection
to avoid duplication). All `ed` props are typed `any`. If a section that SHOULD have
data renders empty across many reports, suspect extraction truncation (see
finvois-extraction-flow.md), not the frontend.
