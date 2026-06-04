---
id: reflection-2026-05-12-respect-nosec
type: reflection
title: I over-flagged a deliberate nosec suppression
date: 2026-05-12
summary: I re-raised a finding the author had suppressed with an inline // nosec that cited a tracked ticket. Respect documented suppressions instead of relitigating them.
tags:
  - false-positive
  - suppressions
  - team-norms
  - process
files_touched:
  - src/crypto/compare.ts
related_pr: "803"
see_also:
  - interaction-2026-04-18-telemetry-await
source: agent
confidence: med
---

## Context
On PR #803 I flagged a comparison the author had already annotated with `// nosec SEC-114` linking a triaged ticket. I raised it again anyway.

## Insight
Re-flagging a documented, ticket-backed suppression wastes the author's time and erodes trust. The suppression is a decision already made and tracked.

## Application
When a finding sits on a line with an inline `// nosec <TICKET>` that cites a tracker id, I defer to it and stay silent. If I think the ticket is wrong, I raise it once, as a question.
