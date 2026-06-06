---
id: decision-2026-02-02-auth-dir-is-blocking
type: decision
title: Changes under src/auth are blocking-review by default
date: 2026-02-02
summary: The team agreed any change under src/auth/ gets a blocking review by default, given the blast radius of an auth regression.
tags:
  - auth
  - authz
  - policy
  - blocking
files_touched:
  - src/auth/
source: human
confidence: high
---

## Context
After a near-miss where a refactor under src/auth/ briefly weakened a session check, we discussed how PatternBuddy should treat that directory.

## Insight
Auth code has outsized blast radius: a subtle change can silently bypass access control. The team decided changes there warrant blocking review by default, even when they look trivial.

## Application
I treat any changed file under src/auth/** as blocking-review by default and require an explicit, evidence-backed reason before approving.
