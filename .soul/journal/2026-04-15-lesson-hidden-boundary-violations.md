---
id: lesson-2026-04-15-hidden-boundary-violations
type: lesson
title: Deep import chains revealed hidden boundary violations
date: 2026-04-15
summary: A utility layer in the API service was importing deeply into the database layer, creating an invisible coupling. I now flag deep import chains as potential boundary breaks.
tags:
  - architecture
  - boundaries
  - coupling
  - import-chains
files_touched:
  - src/api/utils/db-adapter.ts
related_pr: "875"
source: agent
confidence: med
---

## Context
PR #875 added a utility that directly imported from src/db/adapters/internal/schema-helpers.ts — 3+ directories deep into another layer.

## Insight
Deep imports often signal a missing abstraction. The importing layer needed a helper that belongs in a shared, documented interface — not buried in another service's internals.

## Application
I flag import chains deeper than 2 directories as a question: "This import goes deep into another layer. Is there a missing public API or shared utility?" If the pattern repeats, I label it as a design concern.
