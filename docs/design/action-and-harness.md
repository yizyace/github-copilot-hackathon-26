# Soul Review — Action & Harness

> Status: **DESIGN** — committed spec for the two entrypoints + repo layout. Ready to build against.
> Proposed product · Last updated 2026-06-04 · Part of [the design set](./README.md).

Scope: how the shared core ([`runtime-and-subagents.md`](./runtime-and-subagents.md)) is packaged
as a **GitHub Action** and a **local harness**, and where it all lives under `tools/`. Both
consume the same `ReviewResult`.

## 1. The Action package — `action.yml`

A Node action (`using: node20`, bundled with `@vercel/ncc` so no `node_modules` ship).

```yaml
name: "Soul Review"
description: "Personalized, soul-stack-shaped AI code review on pull requests."
author: "yizyace"
branding: { icon: "eye", color: "purple" }
inputs:
  anthropic-api-key:
    description: "Anthropic API key (Claude — the reviewing agent)."
    required: true
  openai-api-key:
    description: "OpenAI API key (embeddings for journal retrieval). Omit → FTS fallback."
    required: false
  soul-dir:
    description: "Path to the .soul/ directory in the checked-out repo."
    required: false
    default: ".soul"
  model:
    description: "Claude model override (else manifest.models.review)."
    required: false
    default: ""
  github-token:
    description: "Token used to fetch the diff and post the review."
    required: false
    default: ${{ github.token }}
  max-files:
    description: "Hard cap on changed files reviewed (large-diff guardrail)."
    required: false
    default: "40"
  fail-soft:
    description: "If true, never fail the job on agent errors; post a notice instead."
    required: false
    default: "true"
runs:
  using: "node20"
  main: "dist/index.js"
```

## 2. The consumer workflow

A team adds `.github/workflows/soul-review.yml` to *their* repo:

```yaml
name: Soul Review
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  contents: read           # read repo + diff
  pull-requests: write     # post the review with inline comments
concurrency:               # one review per PR head; cancel stale runs
  group: soul-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }                 # base..head available locally if needed
      - uses: actions/cache@v4                    # warm the journal index (memory-and-rag.md §5)
        with:
          path: .soul/memory.db
          key:          soul-mem-${{ hashFiles('.soul/journal/**/*.md') }}-emb-3-small
          restore-keys: soul-mem-
      - uses: yizyace/github-copilot-hackathon-26/tools/soul-review/action@v0
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          soul-dir: .soul
```

GitHub Actions can reference an action in a **subdirectory** (`uses: owner/repo/path@ref`), so the
engine can stay in this monorepo for the hackathon. For clean distribution
(`uses: yizyace/soul-review@v1`) extract `tools/soul-review/action/` to its own repo later
(noted in [`roadmap-and-todos.md`](./roadmap-and-todos.md)). `actions/checkout@v6` + `node20` match
the repo's existing CI style.

## 3. Getting the diff

**Primary: Octokit** (already available via `@actions/github`). `pulls.listFiles` +
`repos.compareCommitsWithBasehead(base...head)` give per-file `patch` text → parse into the `Diff`
model (`parseDiff`). **Fallback:** when a file's `patch` is omitted (huge/binary), `fetch-depth: 0`
means the refs are local → `git diff --unified=3 origin/<base>...<head> -- <path>`. Binary files →
`binary: true`, no hunks, skipped by lenses. (Prefer Octokit over shelling to `gh` — no runner
dependency.)

## 4. Posting the review (one review + inline comments)

A single `octokit.pulls.createReview` — one cohesive, voice-consistent review with inline grounded
comments (the north-star), not N issue comments:

```ts
await octokit.rest.pulls.createReview({
  owner, repo, pull_number,
  event: result.verdict === "approve" ? "APPROVE"
       : result.verdict === "request_changes" ? "REQUEST_CHANGES" : "COMMENT",
  body: result.summary,                            // top-level review, in the agent's voice
  comments: result.comments
    .filter(c => c.line != null || c.range)        // only line-anchorable comments go inline
    .map(c => c.range
      ? { path: c.file, start_line: c.range.start, line: c.range.end, side: "RIGHT", body: c.body }
      : { path: c.file, line: c.line!,                              side: "RIGHT", body: c.body }),
});
```

Comments whose line can't be mapped to the diff are appended to the review `body` under a
"General notes" heading — nothing is silently dropped. The verdict comes from the deterministic
mapping in [`runtime-and-subagents.md`](./runtime-and-subagents.md) §4.3.

**First-run / empty journal:** the run proceeds (lenses review from first principles), `citations`
is empty, and the body opens with a notice — *"First run: no journal memories yet. Review based on
soul + rules only; I'll have more context as the journal grows."* — so the empty state reads as
intentional, not broken.

## 5. The local harness (Vite + React + TS)

A **separate** Vite app under `tools/soul-review/harness/` — distinct from the repo's website in
`src/` (which deploys to Pages). The harness is a *local debugging tool*, not deployed. It runs the
**same** `runReview` against a local branch and visualizes the internals. Matches the repo's stack
(React 19, Vite 8, vitest) and reuses the SSE-streaming pattern from `judge-me-bro/web`
(`useRunStream.ts`).

**In-browser vs. tiny local server → tiny local server.** Running core in the browser would leak
`ANTHROPIC_API_KEY`/`OPENAI_API_KEY` into client JS, Anthropic's API isn't browser-CORS-friendly,
and local diffs need filesystem/`git`. So a minimal Node server runs core; React calls it; keys stay
server-side (gitignored `.env`).

```ts
// tools/soul-review/harness/server.ts  (Express or a Vite configureServer middleware)
app.get("/api/review/stream", async (req, res) => {
  sseInit(res);
  const diff = await diffLocalBranch(req.query.base, req.query.head);   // git diff → Diff
  const hooks = {
    onRetrieved:  (lens, hits) => sse(res, "retrieved",  { lens, hits }),
    onLensDone:   (r)          => sse(res, "lens_done",  r),
    onSynthesized:(r)          => sse(res, "review",     r),
    onError:      (s, e)       => sse(res, "error",      { scope: s, message: String(e) }),
  };
  const result = await runReview(
    { diff, soulDir: ".soul", anthropicApiKey: env.ANTHROPIC, openaiApiKey: env.OPENAI }, hooks);
  sse(res, "done", result); res.end();
});
```

A `useReviewStream` hook (typed reducer over `retrieved`/`lens_done`/`review`/`done`/`error`,
modeled on `useRunStream.ts`) drives the panels. **The browser only ever sees `ReviewResult` +
progress events — never keys.** Because it's the *same* `runReview` and the *same* `ReviewResult`,
the harness shows exactly what the Action posts.

**Panels (stacking):**
1. **Run controls + phase chip** — pick base/head branch, soul dir, model; "Run review"; live phase (`loading → retrieving → lenses → synthesizing → done`).
2. **Per-lens cards** (×N, the debugging centerpiece) — each lens's *retrieved memories* (id, source, score) beside its *findings* (file:line, severity badge, message). You see each subagent's inputs and outputs together.
3. **Synthesized review** — the final `ReviewResult`: voice summary, verdict badge, deduped inline comments grouped by file, with `[mem-id]` citation chips linking back to panel 2. Literally what the PR will show.
4. **Citations / provenance** — all `citations` + `meta` (lenses run, lens errors, diff truncated, model, timing): the "why did it say that" audit view; surfaces fail-soft partials.

## 6. Repo layout (the engine, under `tools/`)

A self-contained workspace, separate from the root website. The website (`src/`, root
`package.json`) and the engine (`tools/soul-review/`, its own `package.json`) don't share a build.

```
tools/soul-review/
├─ package.json                  # engine workspace (deps: @anthropic-ai/sdk, openai,
│                                #   better-sqlite3, sqlite-vec, @octokit/*, gray-matter, zod, vitest)
├─ tsconfig.json  eslint.config.js
├─ src/
│  ├─ core/                      # runReview() + pipeline + schemas + anthropic + diff + prompt
│  ├─ memory/                    # MemoryStore + retrieve (memory-and-rag.md)
│  └─ cli.ts                     # `ingest` / `review` subcommands (the Action calls these)
├─ action/
│  ├─ action.yml
│  ├─ src/index.ts               # inputs → fetch diff (octokit) → runReview → createReview
│  └─ dist/index.js              # ncc bundle (committed so `uses:` works)
├─ harness/                      # Vite + React + TS debugging app (NOT the website; not deployed)
│  ├─ index.html  vite.config.ts  package.json
│  ├─ server.ts                  # tiny Node/SSE endpoint running core (keys server-side)
│  └─ src/                       # App.tsx, useReviewStream.ts, LensCard.tsx, ReviewPanel.tsx
└─ examples/sample-soul/.soul/   # demo Soul Stack (Cassandra) — see end-to-end-demo.md
```

For **dogfooding**, this repo can later add its own `.github/workflows/soul-review.yml` running the
subdir action on its own PRs (the existing `.github/workflows/deploy.yml` for Pages is untouched).

## 7. Failure modes (posting layer)

| Failure | Guardrail |
|---|---|
| GitHub review POST fails (e.g. unmappable lines) | Retry once; on persistent failure, post a single issue comment with the full review markdown as the absolute fallback. |
| `fail-soft: true` | Any agent/post error → job exits 0 with a workflow annotation; never red-X the PR. |
| Missing `.soul/` | Friendly notice comment ("No `.soul/` found at `<dir>` — add one to enable Soul Review."), exit 0. |
| Missing keys | If `fail-soft` false → exit non-zero with a clear message; if true → notice + exit 0. |

(Engine-level fail-soft — lens errors, large diffs, bad JSON, synth failure — is in
[`runtime-and-subagents.md`](./runtime-and-subagents.md) §5.)

## Open questions / TODOs

- **`dist/` strategy:** commit the ncc bundle (simplest for `uses:`) vs. a release workflow. Affects the `@v0` ref.
- **Subdir action vs. own repo:** ship from `tools/soul-review/action/` for the hackathon; extract for clean distribution later.
- **Inline-comment line mapping:** clamp findings on unchanged context lines to the nearest changed line vs. demote to the body. Leaning: demote.
- **Harness ↔ website:** keep the harness purely local, or eventually surface a read-only demo of a captured `ReviewResult` on the Pages site for the pitch? Out of scope now; the `ReviewResult` JSON makes it trivial later.
- **Write-back PR:** the proposed-memories PR (see [`soul-stack-format.md`](./soul-stack-format.md) §5) needs `contents: write` + a branch — decide whether the demo uses the PR form or the collapsible-comment form.
