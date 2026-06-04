# Soul Review — Roadmap & TODOs

> Status: **TODO** — build sequence, milestones, consolidated open questions, risks, cuts.
> Proposed product · Last updated 2026-06-04 · Part of [the design set](./README.md).

The design is in the five DESIGN/RESEARCH docs; this is the *work*. Build order is chosen so the
north-star demo ([`end-to-end-demo.md`](./end-to-end-demo.md)) becomes real as early as possible,
then hardens.

## 1. Build sequence

All under `tools/soul-review/` ([`action-and-harness.md`](./action-and-harness.md) §6).

| # | Step | Produces | Notes |
|---|------|----------|-------|
| 1 | **Contracts** | `src/core/schemas.ts`, `src/memory/schemas.ts` | Zod types for `SoulStack`/`Manifest`/`Diff`/`LensFinding`/`ReviewResult`/`RetrievedEntry`/`JournalFrontmatter`. Single source of truth; everything else imports these. |
| 2 | **Soul Stack loader** | `loadSoulStack(dir)` | Parse `soul/ego/rules` + `manifest.yaml`; extract `[[id]]` pointers. Pure, testable. |
| 3 | **Memory (FTS first)** | `MemoryStore` + `retrieve()` on **FTS5** | Zero external deps → unblocks everything without an OpenAI key. `:memory:` tests with `HashEmbedder`. |
| 4 | **Memory (vec)** | `sqlite-vec` backend + `ingest()` + hash cache | Add embeddings; verify the extension loads on `ubuntu-latest` early (risk #1). |
| 5 | **Lens + synth** | `anthropic.ts`, `prompt.ts`, `runReview()` | The subagent fan-out + synthesizer. Tool-mode JSON + Zod gate + repair retry. This is the engine. |
| 6 | **Diff** | `parseDiff`, `capDiff`, `renderDiffForPrompt` | Octokit `patch` parsing + the large-diff guardrail. |
| 7 | **Action** | `action/` + `action.yml` + ncc `dist/` | Inputs → fetch diff → `runReview` → `pulls.createReview`. Fail-soft. |
| 8 | **Harness** | `harness/` (Vite + SSE server + panels) | The debugging UI; reuses the core. The "why" surface. |
| 9 | **Sample soul + seed journal** | `examples/sample-soul/.soul/` | Cassandra + 5 seeded entries so the first PR cites a memory. |
| 10 | **Dogfood** | `.github/workflows/soul-review.yml` | Run the subdir action on this repo's own PRs. |

**Critical path to the demo:** 1 → 2 → 3 → 5 → 6 → 7 → 9. Steps 4, 8, 10 add polish/robustness and
can land in parallel or after.

## 2. Milestones (work backwards from the demo)

| Milestone | Definition of done |
|---|---|
| **M1 — Reviews locally (no GitHub)** | `runReview()` on a local diff produces a valid `ReviewResult` using the FTS backend + sample soul. |
| **M2 — Cites a memory** | A seeded `lesson` is retrieved and appears in `citations` + a comment's `grounded_memory_refs`. |
| **M3 — Posts on a PR** | The Action posts one `createReview` with inline comments on a real PR. |
| **M4 — North-star** | The §3 demo PR gets Cassandra's review citing the ReDoS lesson, end to end. |
| **M5 — Harness mirror** | The harness shows the same run's per-lens memories + findings + final review. |
| **M6 (stretch) — Self-evolving** | Write-back proposes a memory PR a human merges. |

## 3. Consolidated open questions

Pulled from every DESIGN doc's "Open questions" so they live in one place.

**Infra / build**
- `sqlite-vec` native load on `ubuntu-latest` via `better-sqlite3` `loadExtension` — verify early; **FTS is the safety net.**
- FTS5 table shape: plain (recommended) vs external-content.
- `dist/` strategy (commit ncc bundle vs release workflow); subdir action vs. extracting `action/` to its own repo for clean `uses:`.

**Retrieval quality**
- Diff parser + identifier-extraction heuristic (unified-diff vs GitHub `files` payload; regex vs light tree-sitter) — biggest lever on retrieval quality.
- What text from `soul/ego` (`SoulEgoContext`) feeds the whole-PR sub-query; per-lens `type` filter defaults (the architecture→`decision|formative`, style→`lesson|reflection` mapping is a strawman).
- Score tuning: validate `score = 1 - distance/2`; tune RRF `c` and the file-overlap boost on real PRs. Optional cross-encoder/LLM **rerank** (stretch).

**Format / policy**
- Tags vocabulary: controlled seed list (lint-warn) vs free-form.
- Conflict precedence: low-confidence agent `lesson` vs human `decision` — synthesizer prefers the `decision`; the format already carries `type`/`source`/`confidence`.
- Lens ↔ Soul Stack binding: whole stack to every lens (hackathon default) vs `rules_focus`-filtered slice.
- Write-back form: proposed-memories **PR** (needs `contents: write` + a branch) vs collapsible comment.
- Multi-persona (`.soul/<persona>/…`) — out of scope for the demo; layout doesn't preclude it.

**Runtime**
- Pin the default Claude model id; confirm prompt-cache minimum-token threshold for the cached soul/rules prefix.
- Inline-comment line mapping for findings on unchanged context lines (clamp vs demote to body — leaning demote).
- Whether to expose the originating `lens` in PR comments (transparency) or hide it (cleaner single voice).

## 4. Risks & hackathon cuts

Each cut **reduces scope without changing any file format**, so the design survives the cut.

| Risk | Cut / mitigation |
|---|---|
| `sqlite-vec` won't load in CI | Ship the demo on **FTS5** (omit the OpenAI key). |
| Embedding cost/flakiness | Commit a **prebuilt `memory.db`**; zero embedding at run time. |
| Multi-lens orchestration is fiddly | Drop to a **single lens** for the demo (one API call); the synthesizer becomes a pass-through. |
| `see_also` expansion (signal 3) is extra work | **Drop it** — semantic + `[[id]]` pointers are enough. |
| Write-back is risky/complex | **Drop the loop** for the demo; mention it as the "self-evolving" stretch. |
| GitHub posting is flaky live | Demo via the **harness** (identical `ReviewResult`, no GitHub network) or a pre-recorded `ReviewResult`. |
| Diff parsing edge cases (renames/binary) | Cap to text files; binary/huge → skip + note in the review body. |

## 5. Stretch goals (if time remains)

- **Write-back** end to end (M6): the proposed-memories PR a human merges.
- **Rerank** the fused top-k with a cross-encoder or a cheap LLM pass.
- **Multi-persona** in one repo (`.soul/<persona>/…`).
- **`soul-review` CLI**: `init` (scaffold a `.soul/`) and `lint` (size ceilings, frontmatter, `[[id]]`/`see_also` resolution).
- **Pitch surface**: render a captured `ReviewResult` read-only on the Pages **website** (`src/`) — trivial since `ReviewResult` is plain JSON and the panels are pure functions of it.

## 6. Tracking

Per the repo conventions ([AGENTS.md](../../AGENTS.md)), day-to-day work is tracked in **beads**
(`bd-work`). Suggested initial epics map to §1 steps: `contracts`, `soulstack-loader`,
`memory-fts`, `memory-vec`, `engine`, `diff`, `action`, `harness`, `sample-soul`, `dogfood`.
