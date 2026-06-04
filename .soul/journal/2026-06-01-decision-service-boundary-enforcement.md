---
id: decision-2026-06-01-service-boundary-enforcement
type: decision
title: Service boundaries should be enforced at the code level
date: 2026-06-01
summary: The team agreed that service modules should not directly import from each other's internals. Boundaries are enforced via controlled public APIs, not conventions or comments.
tags:
  - architecture
  - modularity
  - boundaries
  - design
files_touched:
  - src/services/
source: human
confidence: high
---

## Context
After PR #912 crossed internal service boundaries multiple times (client code importing from service/**/internal), the team discussed how to enforce service isolation.

## Insight
Services that leak internal APIs become tightly coupled. Over time, the boundary erodes and refactoring becomes impossible. Enforce boundaries at the code level: only import from public/ or index.ts, never from internals.

## Application
I flag any import that crosses into a sibling service's internals (e.g., `import {...} from "../payment/internal/..."`) as a non-blocking concern and suggest the public API instead. I cite the import path.
