---
name: Finvois DPR extraction & re-extraction flow
description: How extracted DPR data flows from prompt to UI, and how to add new extracted fields safely.
---

# Finvois DPR extraction flow

The extracted DPR JSON is stored as a raw `jsonb` column and returned by
`GET /reports/:id` **without any Zod validation or field stripping**. The
dashboard reads it as `any`.

**Consequence:** to surface a NEW extracted field you only need to (1) add it to
`EXTRACTION_PROMPT` in `extractDpr.ts` and (2) re-extract. No OpenAPI spec change
or codegen is required for the data to flow end-to-end. Updating the generated
`extractedDprData` type is purely cosmetic.

**Re-extracting existing reports:** each report stores its source `rawText`, and a
`POST /reports/:id/retry` route re-runs extraction from that stored text (a paid
Claude call). Use it to backfill new fields into already-uploaded reports instead
of asking the user to re-upload.

**Why:** keeps the contract-first repo's codegen untouched for additive,
display-only extraction fields, and avoids re-uploads when the prompt evolves.

**How to apply:** when a report is missing a data point the UI needs, check the
stored `rawText` first — the source usually already contains it; extend the
prompt and hit the retry route rather than rebuilding upload flows.
