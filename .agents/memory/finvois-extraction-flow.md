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

## Truncation gotcha (silent missing sections)

If whole tail-of-schema sections vanish from extracted data after re-extraction,
suspect `max_tokens` truncation, not a frontend bug. Large DPRs need a generous
budget. **Why:** the Anthropic SDK throws "Streaming is required..." for high
`max_tokens` unless you also pass an explicit `{ timeout }` as the 2nd arg to
`client.messages.create`. So raise `max_tokens` AND add the explicit timeout
together — raising the token cap alone makes the call throw. Fields are dropped in
schema order, so the LAST fields in the prompt/JSON are the first to disappear.
Restarting the API-server workflow is required after editing the prompt (dev does
not hot-reload it); then re-extract via the retry route.
