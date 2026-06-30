---
name: Finvois launch/processing polling
description: Why the Finny processing bar got stuck at 95% and how readiness polling must be configured
---

# Launch processing readiness polling

The Launch page plays a cinematic ~27s Finny sequence while extraction runs in
the background (`setImmediate` in the upload handler), then navigates to the
dashboard only once BOTH the animation finished AND `report.status === "ready"`.

**Rule:** the status poll must use `refetchIntervalInBackground: true` and keep
polling for any non-terminal status (stop only on `ready`/`failed`).

**Why:** the app runs inside the Replit preview iframe, which is usually NOT the
focused window. React Query pauses interval refetching for unfocused windows by
default, so the poll silently stalled and the bar froze at 95% — navigating away
and back (a remount + fresh fetch) "fixed" it, which is the tell. A rAF safety
net also force-refetches (throttled) once the cinematic completes but status is
still non-terminal.

**How to apply:** any in-iframe polling that drives navigation/UI completion
needs `refetchIntervalInBackground: true`; don't trust focus-gated polling.
