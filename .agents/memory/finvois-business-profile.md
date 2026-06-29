---
name: Finvois Business Profile conditional sections
description: Why ImplementationTimeline & ProductPortfolioTable in the Business Profile render conditionally and stay empty for existing reports
---

# Business Profile conditional sections

The Business Profile tab (ProfileSection in `artifacts/finvois/src/pages/Dashboard.tsx`)
renders `ImplementationTimeline` and `ProductPortfolioTable` only when
`ed.implementationTimeline` / `ed.productPortfolio` exist on the extracted data.

**Why:** The `extractedDprData` schema (`lib/api-zod/.../extractedDprData.ts` and the
extraction prompt in `artifacts/api-server/src/lib/extractDpr.ts`) has NO
`implementationTimeline` or `productPortfolio` fields, and the re-skin task explicitly
forbade schema/extraction changes. So these two blocks are coded defensively and stay
hidden for all currently-stored reports. This is intentional, not a bug — do not "fix"
the empty sections by inventing data. If they should always show, that requires a
schema + extraction-prompt change first.

**How to apply:** SWOT lives ONLY in Business Profile (removed from EvaluationSection to
avoid duplication). All `ed` props are typed `any`, so referencing not-yet-existing
schema fields does not break typecheck.
