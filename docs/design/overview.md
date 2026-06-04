# Soul Review — Overview

> Status: **RESEARCH** — the vision, framing, and the shape of the whole system.
> Proposed product · Last updated 2026-06-04 · Part of [the design set](./README.md).

## The one-liner

A GitHub Action that drops a *reviewer with a personality and a memory* into your repo.
Instead of a flat `AGENTS.md` that says the same thing to everyone, the reviewer has a
**soul** (who it is), an **ego** (the role it has grown into on *your* team), hard
**rules** (your policy), and a **journal** of everything it has learned — which it
recalls, on demand, when it's relevant to the PR in front of it.

## The problem with a flat instructions file

`AGENTS.md` / `copilot-instructions.md` / `.cursorrules` are the state of the art for
"teaching" an AI about a repo. They have three structural limits:

1. **Flat & shallow.** Everything competes for the same always-loaded budget. Add depth
   (war stories, past decisions, edge cases) and the file bloats until the model skims it.
2. **Static.** It only changes when a human edits it. The reviewer never *accumulates*
   judgment from the PRs it sees.
3. **Impersonal.** It encodes rules, not a *reviewer*. There's no consistent voice, no
   sense that "this is how Cassandra reviews," no taste that sharpens over time.

## The idea: a layered psyche + an associative memory

Soul Review splits "personality" into **always-loaded identity** (short, cheap, every
run) and **on-demand depth** (a journal, fetched semantically):

| Layer | File | Always loaded? | Mutable? | Role |
|-------|------|----------------|----------|------|
| Identity | `soul.md` | ✅ | rarely (human) | who the reviewer *is* — values, voice |
| Disposition | `ego.md` | ✅ | slowly (human + write-back) | the role/lens it has grown into on this team |
| Policy | `rules.md` | ✅ | human only | hard MUST / MUST-NOT constraints |
| Memory | `journal/*.md` | ❌ (RAG) | append-only | what it remembers — decisions, lessons, interactions |
| Config | `manifest.yaml` | ✅ | human only | the wiring (models, lenses, paths, retrieval) |

**The key trick — "don't dump everything in the file."** `soul.md` and `ego.md` are kept
*deliberately short* (hard size ceilings) and carry one-line summaries. The depth lives in
`journal/` entries that are embedded into a vector store and **fetched only when the PR
makes them relevant.** A short `ego.md` line like *"auth changes are blocking-review by
default `[[decision-2026-02-02-auth-dir-is-blocking]]`"* points at a full journal entry
the retrieval layer pulls in when the diff touches `src/auth/`. The personality files stay
skimmable; the journal carries the weight. This mirrors the house **FAT-skills / THIN-agents**
philosophy: the thin always-loaded layer references the fat body, retrieved on demand.

## North-star demo

> A real PR is opened. The Action runs. **Cassandra** posts a single review in her own
> voice — security-and-correctness-minded, direct, kind — whose feedback is visibly shaped
> by her `soul`/`ego`/`rules`, and **cites a memory** from her journal:
> *"This regex runs on a request-derived string with nested quantifiers — same ReDoS shape
> as `[[lesson-2026-05-29-redos-in-slug-validator]]`. Bound it or cap the input."*
> The local **harness** shows the same run's internals: which memories each lens retrieved,
> each lens's findings, and the final synthesized review.

That single moment exercises all five subsystems thinly — it's the thing to build first.

## Architecture at a glance

```
                  ┌──────────────── consuming repo ────────────────┐
                  │  .soul/  soul.md  ego.md  rules.md  manifest.yaml │
                  │          journal/*.md      memory.db (derived)    │
                  └───────────────────────┬────────────────────────┘
  GitHub Action (on: pull_request)        │         Local harness (Vite + React, tools/)
       fetch diff via Octokit             │              git diff a local branch
                  └────────────► soul-review core: runReview(req) ◄────────────┘
                                          │
   load Soul Stack ─► per-lens retrieve memories ─► lens subagent ─► … ─► synthesize
   (always-loaded)     sqlite-vec / FTS5       Anthropic Messages API      one voice +
                       RAG over journal/       (parallel, JSON tool-mode)   cited memories
                                          │
                                ReviewResult  (Zod, serializable)
                    Action → octokit.pulls.createReview     Harness → React panels (SSE)
```

The **same core** drives both entrypoints, so the harness shows *exactly* what the Action
posts. The core lives under `tools/soul-review/`; it has no GitHub or browser dependencies —
I/O happens at the edges (the Action fetches/posts; the harness diffs/renders).

## How it stays personalized — and evolves

- **Personalized:** each repo authors its own `.soul/`. Two teams running Soul Review get
  genuinely different reviewers — different values, different lenses enabled, different
  memories. The persona is the product surface.
- **Evolves (optional, guard-railed):** after a review, the agent may *propose* new journal
  entries ("I learned X") and one capped `ego.md` line — landing as a normal PR a human
  ratifies. It **never** self-edits `soul.md` or `rules.md`. So the reviewer's judgment
  sharpens over time without its identity drifting. (See [`soul-stack-format.md`](./soul-stack-format.md) §write-back.)

## The five subsystems (and where they're specified)

1. **Personality format** — [`soul-stack-format.md`](./soul-stack-format.md)
2. **Memory + retrieval (RAG)** — [`memory-and-rag.md`](./memory-and-rag.md)
3. **Review runtime (orchestrator + lens subagents)** — [`runtime-and-subagents.md`](./runtime-and-subagents.md)
4. **GitHub Action + local harness** — [`action-and-harness.md`](./action-and-harness.md)
5. **The end-to-end demo** — [`end-to-end-demo.md`](./end-to-end-demo.md)

The seven decisions that shaped all of the above are recorded in [`decisions.md`](./decisions.md);
the build order and open questions are in [`roadmap-and-todos.md`](./roadmap-and-todos.md).

## Glossary

- **Soul Stack** — the five-part personality: `soul.md`, `ego.md`, `rules.md`, `journal/`, `manifest.yaml`.
- **Lens** — a persona-flavored sub-reviewer (e.g. injection, authz, async-safety), each run as its own LLM call ("subagent").
- **Journal** — append-only long-form memories, embedded and retrieved on demand.
- **Retrieval (RAG)** — semantic + pointer-based fetch of the journal entries relevant to a diff.
- **Synthesizer** — the step that merges all lenses' findings into one review in the agent's single voice.
- **Write-back** — the loop where the agent *proposes* new memories after a review (human-ratified).
- **Cassandra** — the example reviewer persona used throughout (security & correctness).
