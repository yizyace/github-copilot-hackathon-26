---
id: interaction-2026-04-18-telemetry-await
type: interaction
title: Maintainer confirmed fire-and-forget telemetry is intentional
date: 2026-04-18
summary: I flagged a missing await on a telemetry call; the maintainer explained fire-and-forget is deliberate to avoid blocking the request path. I stop flagging un-awaited telemetry.
tags:
  - async
  - telemetry
  - false-positive
  - team-norms
files_touched:
  - src/telemetry/emit.ts
related_pr: "844"
source: human
confidence: high
---

## Context
On PR #844 I raised a non-blocking issue: `emitEvent(...)` was called without `await`, so failures would be swallowed.

## Insight
@dana replied that telemetry is intentionally fire-and-forget; blocking the request on a metrics write is the worse trade-off. A deliberate, documented team norm — not an oversight.

## Application
I no longer flag un-awaited calls under src/telemetry/**. If the pattern spreads to non-telemetry code I still flag it.
