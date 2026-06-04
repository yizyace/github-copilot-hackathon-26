# Soul Review — Decisions (ADRs)

> Status: **DECISION** — the seven locked choices that shape the design, with rationale.
> Proposed product · Last updated 2026-06-04 · Part of [the design set](./README.md).

These are lightweight ADRs. Each records the **context**, the **decision**, the
**alternatives** weighed, and the **consequences**. They were settled during the
brainstorm; revisit any one if its context changes.

---

## Decision 1 — North-star demo: PR → personality-driven review

**Status:** Accepted.

**Context.** The product is five subsystems (format, memory, runtime, Action, harness).
A hackathon needs one thing to build toward so the rest becomes polish.

**Decision.** Build toward a single moment: a real PR triggers the Action, and the agent
posts one review **visibly shaped by its `soul`/`ego`/`rules`** that **cites a retrieved
memory**. Everything is sequenced to make that moment real first.

**Alternatives.** *Harness-first* (nail local debugging, Action last — lower demo flash);
*authoring + RAG quality* (focus on memory retrieval, review output secondary — best if
retrieval were the research contribution). Rejected because the cited-memory PR review is
the tightest "wow" and exercises every subsystem thinly.

**Consequences.** The journal must be seeded so the *first* PR can cite something
([`end-to-end-demo.md`](./end-to-end-demo.md)). Retrieval and synthesis must produce a
visible citation, so `ReviewResult` carries `citations` + `grounded_memory_refs`.

---

## Decision 2 — Memory store: SQLite + `sqlite-vec`

**Status:** Accepted.

**Context.** The journal needs semantic retrieval. The corpus is small (tens to low
hundreds of entries). The user already uses `better-sqlite3` elsewhere (`judge-me-bro`).

**Decision.** Store journal entries + embeddings in a local **SQLite** file via the
**`sqlite-vec`** extension on `better-sqlite3`; embed with OpenAI `text-embedding-3-small`
(1536-dim). Brute-force KNN is fine at this scale. Provide a no-API-key **FTS5 lexical**
fallback satisfying the same contract. Details in [`memory-and-rag.md`](./memory-and-rag.md).

**Alternatives.** *beads/dolt + app-side cosine* (on-brand, git-versioned memory, but
embedded-Dolt friction and no native vector ops); *flat-file / in-memory vectors* (zero
infra, but not durable). Rejected in favor of a real-but-simple vector store with an offline
fallback.

**Consequences.** `memory.db` is a derived artifact (gitignored; rebuilt from `journal/`).
Adds a native dependency (`sqlite-vec`) whose CI load must be verified — FTS5 is the safety
net if it won't load on the runner.

---

## Decision 3 — Stack: Node + TypeScript

**Status:** Accepted.

**Context.** The engine runs headless in an Action *and* in a local web harness. The repo
is already a Vite + React + TypeScript project; sibling projects are TS.

**Decision.** Build the core, the Action, and the harness in **Node + TypeScript**. Use
**Zod** as the single source of truth for the data contracts (mirroring `judge-me-bro`).

**Alternatives.** *Python* (nicer numpy/RAG ergonomics, `uv` CI) — more friction for a JS
GitHub Action and the web harness. *Hybrid TS core + Python RAG* — integration overhead not
worth it in a hackathon.

**Consequences.** One language across all surfaces; the harness can import the core's Zod
schemas directly. A JS Action (`using: node20`) is the natural packaging.

---

## Decision 4 — Personality shape: the five-part Soul Stack

**Status:** Accepted.

**Context.** "It needs soul" — a richer model than a flat instructions file, but still
authorable and demoable.

**Decision.** Five parts: **`soul.md`** (identity/values), **`ego.md`** (self-model/role,
the index into memory), **`rules.md`** (hard policy), **`journal/`** (RAG-fetched long-form
memory), **`manifest.yaml`** (config). `soul`/`ego` stay short with hard size ceilings; the
journal carries depth. Full spec in [`soul-stack-format.md`](./soul-stack-format.md).

**Alternatives.** *Leaner* (`soul` + `rules` + `journal`, ego folded into soul — fewer parts
but loses the stable-identity vs evolving-self distinction); *richer* (add `voice.md` +
`relationships.md` — more expressive, more surface to build). The five-part split is the
sweet spot for the "why it has soul" story without over-scoping.

**Consequences.** Requires the summary↔detail pointer mechanism (so short files reach deep
memory) and a write-back policy (what may evolve vs. what is immutable).

---

## Decision 5 — Review runtime: orchestrator → lens subagents → synthesizer

**Status:** Accepted.

**Context.** A single monolithic review prompt is simpler but flattens the personality and
can't retrieve memory per concern. The user wants subagents used heavily.

**Decision.** An **orchestrator** loads the Soul Stack and fans out to several
persona-flavored **lens subagents** (e.g. injection, authz, async-safety) — each retrieves
its *own* memories and returns structured findings — then a **synthesizer** merges them into
one review in the agent's single voice, grounded in the cited memories. Spec in
[`runtime-and-subagents.md`](./runtime-and-subagents.md).

**Alternatives.** *Single persona reviewer* (one pass over the whole diff — simpler/cheaper,
less of a multi-agent showcase, and no per-lens memory slices). Chosen multi-lens for the
richer review and the demo's per-lens transparency, accepting more orchestration.

**Consequences.** Per-lens retrieval makes the harness's per-lens panels meaningful; more
LLM calls per PR (mitigated by prompt caching and a concurrency cap).

---

## Decision 6 — Subagent mechanism: direct Anthropic Messages API (not Claude-Code subagents)

**Status:** Accepted.

**Context.** "Subagents" could mean Claude-Code subagents (as in `judge-me-bro`, spawned on
a subscription via an interactive parent). But the Action runs **headless** in CI — no
Claude Code, no interactive loop, no subscription auth.

**Decision.** Implement each lens as a **direct Anthropic Messages API call** with its own
system prompt (assembled from `soul`+`ego`+`rules`+lens role+retrieved memory), forced into
JSON via tool-mode, run in parallel with a concurrency cap. The synthesizer is the same
mechanism. This is the only option that runs **identically** in the Action and the harness.

**Alternatives.** *Claude-Code / Agent-SDK subagents* — great for *local* exploration, but
re-introduce the exact headless constraint we must escape; kept as a noted future local-only
driver behind the same `LensResult` contract.

**Consequences.** Deterministic, cheap (`temperature: 0`, cached shared prefix), CI-safe.
"Use subagents extensively" is honored literally — each lens is a separate model invocation
with its own prompt and memory.

---

## Decision 7 — Integration: tooling under `tools/`, captured as an additive proposal

**Status:** Accepted (project product remains officially TBD).

**Context.** This repo is dual-purpose (a GitHub Pages **website** in `src/` + hackathon
**tooling** under `tools/`), and AGENTS.md states the specific product is **TBD**. The
planning anchors (`project-plan.md`, `eli5.md`) are shared *team* docs.

**Decision.** Capture this design **additively**: a self-contained, clearly-labeled
`docs/design/` set proposing Soul Review as one candidate product. The eventual engine code
would live under **`tools/soul-review/`** (not a new top-level monorepo). Leave the team's
TBD anchors untouched; add only a pointer from `docs/README.md`.

**Alternatives.** *Fill the anchors* (commit the team to this product) — too unilateral for
shared docs while the product is TBD. *Design docs only, no pointers* — too easy to lose.

**Consequences.** The design is discoverable but non-binding; if the team adopts it, fold
`overview.md` + `decisions.md` into `project-plan.md` and the lead into `eli5.md`.
