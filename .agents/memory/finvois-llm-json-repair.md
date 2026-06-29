---
name: Finvois LLM JSON repair
description: Why DPR extraction parses AI JSON through jsonrepair, not plain JSON.parse
---

Claude's DPR extraction on large payloads (~40k chars of OCR'd text) reliably
emits invalid JSON for some reports — observed: leading-zero number literals
(e.g. `075206`, carried from source figures) and missing commas between array
elements. A single defect aborts the whole `JSON.parse`, failing extraction.

**Rule:** parse all model JSON through the `parseLlmJson` helper in
`extractDpr.ts` — it tries `JSON.parse` first (fast path) and falls back to
`jsonrepair()` then parse. All three parse sites (extraction, summary,
verdicts) use it.

**Why:** hand-rolling per-defect sanitizers is whack-a-mole — fixing leading
zeros just surfaced the next missing-comma error deeper in the same document.
`jsonrepair` handles the whole class (leading zeros, missing/trailing commas,
unquoted keys) in one dependency.

**How to apply:** never call `JSON.parse` directly on model output here; route
it through `parseLlmJson`. If a new report still fails, inspect the logged
`snippet` but prefer extending the repair path over adding bespoke regex.
