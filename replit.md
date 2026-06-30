# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

Finvois AI turns a Detailed Project Report (DPR) PDF into a banker-grade
financial briefing. Flow: upload a DPR → choose a branding look (meet "Finny",
the mascot) → cinematic processing → interactive dashboard (P&L, balance sheet,
ratios, DSCR, Altman Z, BEP, MPBF) with an AI executive summary and per-section
verdicts. Reports can be exported to a print/PDF view.

### Branding themes (per report)
Each report carries one of three branding-shell themes: `finny` (black/gold),
`blue` (Professional Blue — the default), `white-gold` (Executive White, light).
Themes restyle ONLY the branding shell (landing, theme-select, processing,
sidebar, hero, header, export). Financial sections (KPI cards, charts, tables)
stay pixel-identical across themes — see `.agents/memory/finvois-theming.md` for
the token rules (`--shell-*`/`--sidebar-*` are themeable; `--brand`/`--gold`/
`--chart-*` are NOT).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
