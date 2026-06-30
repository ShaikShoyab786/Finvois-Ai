---
name: Finvois branding-shell theming
description: How the per-report 3-theme (finny/blue/white-gold) system is structured and the hard constraint that keeps financial sections identical.
---

# Finvois branding-shell theming

Per-report theme system with three themes: `finny` (black/gold signature),
`blue` (Professional Blue, the default that matches the original look),
`white-gold` (Executive White, a LIGHT shell). Theme is stored per report in
the DB (`reports.theme`, nullable; `null` resolves to `blue`).

## The hard constraint (do not break)
Themes must affect ONLY the branding shell (landing, theme-select, processing,
sidebar, hero banner, report header, export button). Financial sections — KPI
cards, charts, tables, graphs — must render pixel-identical across all themes.

**Why:** the product promise is that the numbers never change with the look.

**How to apply:** `--brand`, `--gold`, and `--chart-*` CSS vars feed financial
sections and are used heavily inside Dashboard.tsx (`text-brand`, `bg-brand`,
`text-gold`, `--chart-1: var(--brand)`). NEVER put these under a theme override.
Themeable surfaces use a separate token family: new `--shell-*` tokens plus the
existing `--sidebar-*` tokens. Theme blocks (`[data-theme="..."]`) override only
those two families. `:root` holds the blue defaults so an unset theme equals the
original design.

## Mechanics
- `ThemeProvider` (src/contexts/theme.tsx) sets `document.documentElement.dataset.theme`.
  Landing (Home) forces `finny`; Dashboard/Export adopt the report's saved theme.
- Light-shell themes (white-gold) need a `--sidebar-heading` token because the
  shell Sidebar previously hard-coded `text-white`, which is invisible on a light
  sidebar. Any new shell surface must use shell/sidebar tokens, never literal
  `text-white`, or it breaks the light theme.
- Flow: Upload → `/reports/:id/launch` (theme select → cinematic ~27s Finny
  processing, polls report.status until `ready`) → `/reports/:id`.
