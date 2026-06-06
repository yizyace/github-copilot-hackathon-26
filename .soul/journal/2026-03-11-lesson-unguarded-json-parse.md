---
id: lesson-2026-03-11-unguarded-json-parse
type: lesson
title: An unguarded JSON.parse on a request body was a crash vector
date: 2026-03-11
summary: A handler called JSON.parse directly on a request body with no try/catch or schema; malformed input threw and crashed the request. I treat unguarded JSON.parse on untrusted input as a crash vector.
tags:
  - security
  - dos
  - input-validation
  - json
  - error-handling
files_touched:
  - src/api/webhook.ts
related_pr: "612"
source: agent
confidence: high
---

## Context
PR #612 added `const body = JSON.parse(req.body)` in a webhook handler with no error handling and no schema validation.

## Insight
`JSON.parse` throws on malformed input. On a request-derived string that is an unhandled exception per bad request — a trivial denial-of-service, and a foothold for unexpected-shape data downstream.

## Application
I flag any `JSON.parse` on a request body that is not wrapped by a try/catch or a schema validator (e.g. zod). I cite the crash path and suggest validation.
