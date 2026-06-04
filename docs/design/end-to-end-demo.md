# Soul Review — End-to-End Demo

> Status: **EXPERIMENT** — the demo script + sample soul stack. Throwaway-friendly; tune freely.
> Proposed product · Last updated 2026-06-04 · Part of [the design set](./README.md).

The single moment to build toward ([`decisions.md`](./decisions.md) #1): a real PR gets a review
visibly shaped by `soul`/`ego`/`rules` that **cites a retrieved memory**, with the harness showing
the same run's internals.

## 1. The demo in one paragraph

A PR adds a slug-validation regex on a request parameter. The Action runs **Cassandra**. Her
`injection` lens retrieves a seeded journal `lesson` about a past ReDoS, and she posts:

> **suggestion (blocking):** This regex `^([a-z]+-?)+$` runs on a request-derived string and has
> nested unbounded quantifiers — catastrophic backtracking (ReDoS, CWE-1333). Same shape as when
> we hit this before *(per `lesson-2026-05-29-redos-in-slug-validator`)*. Bound the input length
> or use a non-backtracking pattern.

Then we open the **harness** and show: the `injection` lens's retrieved memories (the ReDoS lesson,
top-ranked), its raw findings, and the final synthesized review with the citation chip — i.e. *why*
she said it.

## 2. The sample soul stack (`examples/sample-soul/.soul/`)

Use the **Cassandra** examples verbatim from [`soul-stack-format.md`](./soul-stack-format.md):
`soul.md` (§1.1), `ego.md` (§1.2), `rules.md` (§1.3), `manifest.yaml` (§4). Seed the journal so the
*first* PR can cite something:

```
examples/sample-soul/.soul/journal/
  2026-02-02-decision-auth-dir-is-blocking.md        # decision (human) — referenced by ego.md
  2026-04-18-interaction-telemetry-await.md          # interaction (human) — a false-positive norm
  2026-05-29-lesson-redos-in-slug-validator.md       # lesson (agent) — THE memory the demo cites
  2026-03-11-lesson-unguarded-json-parse.md          # lesson — extra retrieval candidate
  2026-05-12-reflection-respect-nosec.md             # reflection — extra retrieval candidate
```

The first three are written out in [`soul-stack-format.md`](./soul-stack-format.md) §1–2; the last
two follow the same format (referenced by `ego.md`'s pointers). Five entries is plenty to make
retrieval visibly *choose* the right one.

## 3. The demo PR (the trigger)

Open a PR against the guinea-pig repo that adds, in a request handler:

```ts
// src/validation/slug.ts
export function isValidSlug(slug: string): boolean {
  return /^([a-z]+-?)+$/.test(slug);   // ← nested unbounded quantifiers on request input
}
```

This is intentionally the *exact shape* the seeded `lesson` warns about, so retrieval is a clean
hit and the citation is unambiguous. (Secondary candidate: add an un-awaited non-telemetry async
call to show the `interaction` memory *correctly NOT* suppressing it outside `src/telemetry/**`.)

## 4. Run it — two surfaces

**A. The Action (the headline).**
1. Guinea-pig repo has `.soul/` (the sample) committed and `.github/workflows/soul-review.yml`
   ([`action-and-harness.md`](./action-and-harness.md) §2) with `ANTHROPIC_API_KEY` +
   `OPENAI_API_KEY` set as repo secrets.
2. Open the PR from §3.
3. The workflow runs: checkout → cache/restore `memory.db` → `ingest` (warm = no-op) → `review` →
   `pulls.createReview`.
4. Cassandra's review appears on the PR with the cited memory.

**B. The harness (the "why").** From `tools/soul-review/harness/`: `npm run dev`, point it at the
same local branch, "Run review". Show panel 2 (the `injection` lens's retrieved memories + findings)
and panel 3 (the synthesized review with the `[mem-id]` chip linking back). Same `ReviewResult` as
the PR.

## 5. What success looks like (checklist)

- [ ] The review is **one** cohesive PR review in Cassandra's voice (not a pile of bot comments).
- [ ] At least one comment **cites** `lesson-2026-05-29-redos-in-slug-validator` (visible `(per …)` + a `citations` entry).
- [ ] The finding is anchored to the right `file:line` in the diff.
- [ ] Severity + verdict are sensible (a blocking ReDoS → `request_changes`).
- [ ] The harness shows the *same* run's per-lens memories and findings.
- [ ] First-run-with-empty-journal degrades gracefully (test by emptying `journal/`): review still posts, with the first-run notice and no citations.

## 6. Fallback demo paths (de-risking)

| Risk on the day | Fallback |
|---|---|
| `sqlite-vec` won't load on the runner | Run on the **FTS5 lexical** backend (omit `OPENAI_API_KEY`); the ReDoS lesson still hits on keyword overlap ("regex", "slug", "redos"). Same `retrieve()` contract. |
| Embedding/index cost or flakiness | Commit a **prebuilt `memory.db`** (the named fallback in [`memory-and-rag.md`](./memory-and-rag.md) §5) so the run does zero embedding. |
| Live GitHub run is flaky | Drive the **harness** end-to-end locally against a local branch — identical core, identical `ReviewResult`, no network to GitHub. |
| Anthropic rate limit mid-demo | Pre-record a `ReviewResult` JSON and have the harness render it (the panels are pure functions of `ReviewResult`). |

## 7. Talking points (for the pitch)

- "A flat `AGENTS.md` says the same thing to everyone and never learns. This reviewer has a soul,
  a role, and a memory it recalls when it's relevant."
- "Watch it cite a past lesson — that depth lives in the journal, not crammed into the instructions
  file. The personality files stay short; the memory is fetched."
- "Same engine in CI and in this debugger, so you can see *why* it said what it said."
- (If showing write-back) "After the review it *proposes* what it learned as a PR — a human ratifies
  it. It never rewrites its own identity or rules."
