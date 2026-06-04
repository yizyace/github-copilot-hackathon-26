# Soul Review — Design Docs (proposed product)

> Status: **INDEX** — index + label legend for the Soul Review design set.
> Proposed product · Last updated 2026-06-04. The repo's product is officially **TBD**
> (see [AGENTS.md](../../AGENTS.md)); this set fully specifies **one** candidate — a
> personalized, "soulful" PR-review agent — so the team can adopt, adapt, or pass on it.

> **Fresh agent / teammate, read this first.** "Soul Review" (working title) is a
> distributable **GitHub Action** that gives a repo a *personalized* AI code reviewer:
> a layered personality — `soul.md` (identity), `ego.md` (self-model), `rules.md`
> (hard policy) — kept short and always-loaded, plus a **journal** of long-form memories
> fetched on demand (RAG) based on the PR diff. The same engine also runs in a local
> **debugging harness**. Tooling would live under `tools/` per the repo layout; the
> website in `src/` is separate. **Nothing here is built yet — these are specs.**
> Start with [`overview.md`](./overview.md).

## Status-label legend

| Label | Meaning |
|-------|---------|
| **RESEARCH** | Vision / framing; not yet a committed design. |
| **DESIGN** | Committed technical spec, ready to build against. |
| **DECISION** | An ADR — a locked choice with rationale + alternatives. |
| **EXPERIMENT** | A demo / probe / validation script. |
| **TODO** | Open work: roadmap, milestones, questions. |
| **INDEX** | This file. |

## The set

| Doc | Label | Covers |
|-----|-------|--------|
| [`overview.md`](./overview.md) | RESEARCH | The vision, the "fancier `AGENTS.md`" thesis, the north-star demo, architecture at a glance, glossary |
| [`decisions.md`](./decisions.md) | DECISION | The seven locked choices with rationale + alternatives considered |
| [`soul-stack-format.md`](./soul-stack-format.md) | DESIGN | The personality file format (`soul`/`ego`/`rules`/`journal`/`manifest`), the summary↔memory pointer mechanism, the write-back loop |
| [`memory-and-rag.md`](./memory-and-rag.md) | DESIGN | SQLite + `sqlite-vec` store, the `retrieve()` contract, index lifecycle, FTS fallback, cost envelope |
| [`runtime-and-subagents.md`](./runtime-and-subagents.md) | DESIGN | The shared core, orchestrator → lens subagents → synthesizer, the type contracts, prompt assembly, fail-soft |
| [`action-and-harness.md`](./action-and-harness.md) | DESIGN | GitHub Action packaging, the consumer workflow, diff/post via Octokit, the local harness, `tools/` layout |
| [`end-to-end-demo.md`](./end-to-end-demo.md) | EXPERIMENT | The PR→review demo with the sample "Cassandra" soul stack, and fallback demo paths |
| [`roadmap-and-todos.md`](./roadmap-and-todos.md) | TODO | Build sequence, milestones, consolidated open questions, risks, hackathon cuts |

## Conventions used across this set

- Working name **Soul Review** / id **`soul-review`** — rename freely.
- Models: review = **`claude-sonnet-4-6`**, embeddings = **`text-embedding-3-small`**.
- Canonical memory type is **`RetrievedEntry`**. Runtime "subagents" are **parallel direct Anthropic Messages API calls**, *not* Claude-Code subagents (they can't run headless in an Action — see [`decisions.md`](./decisions.md) #6).
- Tooling lives under **`tools/`** (repo convention); the React **website** in `src/` is a separate concern.
- Example persona **"Cassandra"** (security & correctness) is used throughout the examples.

## If the team adopts this

Fold [`overview.md`](./overview.md) + [`decisions.md`](./decisions.md) into the anchor
[`project-plan.md`](../project-plan.md), and the one-liner / "how it works" into
[`eli5.md`](../eli5.md). Until then these stay self-contained so the anchors remain the
team's to finalize.
