// The pre-captured north-star run: a PR adds a slug-validation regex; PatternBuddy's
// injection lens retrieves the seeded ReDoS lesson and cites it. This fixture is
// what the landing demo and the editor's "Run demo review" render — no engine,
// no keys. Mirrors docs/design/end-to-end-demo.md.

import type { ReviewResult } from './types'

const redosComment = {
  file: 'src/validation/slug.ts',
  line: 4,
  code: 'return /^([a-z]+-?)+$/.test(slug)',
  severity: 'blocking' as const,
  label: 'suggestion',
  body:
    'This regex `^([a-z]+-?)+$` runs on a request-derived string and has nested unbounded quantifiers — catastrophic backtracking (ReDoS, CWE-1333). Same shape as when we hit this before. Bound the input length or use a non-backtracking pattern.',
  citations: ['lesson-2026-05-29-redos-in-slug-validator'],
}

export const sampleReviewResult: ReviewResult = {
  persona: 'PatternBuddy',
  avatar: '🔮',
  verdict: 'request_changes',
  summary:
    "1 blocking, 0 non-blocking. The highest-risk change is a slug-validation regex on request input with catastrophic backtracking — bound it before this merges. I've seen this exact shape before; the rest of the diff reads clean.",
  comments: [redosComment],
  lenses: [
    {
      id: 'injection',
      title: 'Injection',
      retrieved: [
        {
          id: 'lesson-2026-05-29-redos-in-slug-validator',
          type: 'lesson',
          source: 'agent',
          score: 0.91,
          summary:
            'An innocent validation regex on a user-supplied slug had nested unbounded quantifiers, enabling catastrophic backtracking (ReDoS).',
        },
        {
          id: 'lesson-2026-03-11-unguarded-json-parse',
          type: 'lesson',
          source: 'agent',
          score: 0.42,
          summary: 'An unguarded JSON.parse on a request body was a crash vector.',
        },
      ],
      comments: [redosComment],
    },
    {
      id: 'authz',
      title: 'Authorization',
      retrieved: [
        {
          id: 'decision-2026-02-02-auth-dir-is-blocking',
          type: 'decision',
          source: 'human',
          score: 0.27,
          summary: 'Changes under src/auth/ are blocking-review by default.',
        },
      ],
      comments: [],
    },
    {
      id: 'async-safety',
      title: 'Async safety',
      retrieved: [
        {
          id: 'interaction-2026-04-18-telemetry-await',
          type: 'interaction',
          source: 'human',
          score: 0.19,
          summary: 'Fire-and-forget telemetry is intentional; stop flagging un-awaited telemetry.',
        },
      ],
      comments: [],
    },
  ],
  meta: {
    model: 'claude-sonnet-4-6',
    lensesRun: 3,
    durationMs: 8200,
    diff: { file: 'src/validation/slug.ts', additions: 3, deletions: 0 },
  },
}
