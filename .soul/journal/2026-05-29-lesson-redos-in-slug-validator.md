---
id: lesson-2026-05-29-redos-in-slug-validator
type: lesson
title: A slug validator regex was a ReDoS vector
date: 2026-05-29
summary: An innocent validation regex on a user-supplied slug had nested unbounded quantifiers, enabling catastrophic backtracking (ReDoS). I now check request-derived strings for unbounded quantifiers.
tags:
  - security
  - redos
  - regex
  - input-validation
  - dos
files_touched:
  - src/validation/slug.ts
related_pr: "891"
see_also:
  - decision-2026-02-02-auth-dir-is-blocking
source: agent
confidence: high
---

## Context
PR #891 added `^([a-z]+-?)+$` to validate URL slugs from a request param. It passed tests and looked harmless.

## Insight
`([a-z]+-?)+` has nested unbounded quantifiers. On input like "aaaaaaaaaaaaaaaaaaaa!" the engine backtracks exponentially — a classic ReDoS. The risk came entirely from the input being request-derived and unbounded.

## Application
When a regex is applied to a request-derived string I inspect it for nested/unbounded quantifiers and either flag it (BLOCKING on a hot path) or suggest a bounded alternative. I cite CWE-1333.
