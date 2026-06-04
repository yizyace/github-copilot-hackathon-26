# Soul Review — Runtime & Subagents

> Status: **DESIGN** — committed spec for the review engine (core + orchestration). Ready to build against.
> Proposed product · Last updated 2026-06-04 · Part of [the design set](./README.md).

Scope: the shared **core** that both entrypoints drive — load → retrieve → review
(orchestrator + lens subagents) → synthesize → `ReviewResult`. Packaging (Action, harness)
is in [`action-and-harness.md`](./action-and-harness.md). Assumes `loadSoulStack(dir)` (format
in [`soul-stack-format.md`](./soul-stack-format.md)) and `retrieve(query, opts)` returning
`RetrievedEntry[]` (contract in [`memory-and-rag.md`](./memory-and-rag.md)).

**Style anchor:** Zod schema-as-contract + fail-closed validation with a repair retry, exactly
like `judge-me-bro/harness/{schemas.ts,eval.ts}`. The deterministic aggregation (dedupe,
severity sort, verdict) is code, not model, like `computeIdeaReviewSummary`.

## 0. The decision that shapes the core (subagents are API calls)

`judge-me-bro`'s "subagents" are Claude-Code subagents on a subscription, spawned via an
interactive parent. **That model can't run headless in a GitHub Action** — no Claude Code, no
interactive loop, no subscription auth. So the core implements "subagents" as **direct Anthropic
Messages API calls** (one per lens, parallel, distinct system prompts), and the Action *and* the
harness both drive that same core. (See [`decisions.md`](./decisions.md) #6.)

## 1. Core boundary

The core is a pure, side-effect-light library at `tools/soul-review/src/core/`: in a
`ReviewRequest`, out a serializable `ReviewResult`. It knows nothing about GitHub or the
browser — I/O lives at the edges. Zod is the single source of truth; the harness imports the
core's schemas directly.

```
tools/soul-review/src/core/
  index.ts      # runReview(req, hooks?)  — the one public entrypoint
  pipeline.ts   # load → retrieve → review → synthesize
  schemas.ts    # Zod contracts (mirrors judge-me-bro/harness/schemas.ts)
  soulstack.ts  # loadSoulStack(dir)  (parser + manifest; see soul-stack-format.md)
  anthropic.ts  # Messages API wrapper: lens + synth, tool-mode JSON, caching, retries
  diff.ts       # parseDiff, capDiff, renderDiffForPrompt
  prompt.ts     # assembleLensSystemPrompt / assembleSynthSystemPrompt
```

```ts
export async function runReview(req: ReviewRequest, hooks?: ReviewHooks): Promise<ReviewResult>;
```

`ReviewResult` is plain JSON (Zod-validated), so the Action renders it to the GitHub Reviews API
and the harness renders it to React panels — identically.

## 2. Key types

```ts
// ── Soul Stack ──────────────────────────────────────────────────────────────
export interface SoulStack {
  soul: string;            // soul.md  (raw markdown)
  ego: string;             // ego.md
  rules: string;           // rules.md (injected verbatim, non-negotiable)
  manifest: Manifest;      // manifest.yaml (parsed — canonical schema in soul-stack-format.md §4)
  journalDir: string;      // for retrieve()
  sourceDir: string;       // the .soul/ root
}
export interface LensConfig {  // one entry of manifest.lenses
  id: string; title: string; enabled: boolean;
  role_prompt: string;
  rules_focus?: string[];
  severity_ceiling?: Severity;
  retrieval_query?: string;
  weight?: number;
}

// ── Diff (parsed unified diff) ──────────────────────────────────────────────
export interface Diff { files: ChangedFile[]; truncated: boolean; base: string; head: string; }
export interface ChangedFile {
  path: string; oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed";
  hunks: Hunk[]; binary: boolean;
}
export interface Hunk {
  header: string;                       // @@ -a,b +c,d @@
  oldStart: number; oldLines: number; newStart: number; newLines: number;
  lines: DiffLine[];
}
export interface DiffLine { kind: "add" | "del" | "ctx"; text: string; newLineNo?: number; oldLineNo?: number; }

// ── Findings ────────────────────────────────────────────────────────────────
export type Severity = "info" | "nitpick" | "suggestion" | "warning" | "blocking"; // Conventional Comments
export interface LensFinding {
  file: string;                         // must match a ChangedFile.path
  line?: number;                        // single-line anchor (new-file line number)
  range?: { start: number; end: number };
  severity: Severity;
  message: string;                      // comment body (markdown), in voice
  grounded_memory_refs: string[];       // RetrievedEntry.entryId[] this finding leans on (may be empty)
  lens: string;                         // LensConfig.id that produced it
  confidence?: number;                  // 0..1 (dedup/priority; not shown)
}
export interface LensResult {
  lens: string;
  findings: LensFinding[];
  memoriesUsed: RetrievedEntry[];       // what THIS lens retrieved (harness panel)
  error?: string;                       // set if this lens failed (fail-soft)
  raw?: string;                         // raw model text (harness debug only)
}

// ── Final review (THE serializable contract both entrypoints consume) ───────
export interface ReviewResult {
  schemaVersion: 1;
  agentName: string;
  summary: string;                      // top-level review body, in the agent's ONE voice
  verdict: "approve" | "comment" | "request_changes";
  comments: ReviewComment[];            // inline comments, deduped + prioritized
  citations: RetrievedEntry[];          // every memory cited anywhere (UI + provenance)
  meta: {
    base: string; head: string;
    lensesRun: string[];
    lensErrors: { lens: string; error: string }[];   // surfaces partials; never empty-crashes
    diffTruncated: boolean; model: string;
    startedAt: string; finishedAt: string;
  };
}
export interface ReviewComment {
  file: string; line?: number; range?: { start: number; end: number };
  severity: Severity;
  body: string;                         // final markdown, prefixed with a Conventional-Comments label
  lens: string; grounded_memory_refs: string[];
}

// ── Request / hooks ─────────────────────────────────────────────────────────
export interface ReviewRequest {
  diff: Diff; soulDir: string;
  anthropicApiKey: string; openaiApiKey?: string;
  modelOverride?: string;
  prContext?: { title?: string; body?: string; baseRef: string; headRef: string };
}
export interface ReviewHooks {          // progress fan-out (SSE in harness; log lines in Action)
  onRetrieved?(lens: string, hits: RetrievedEntry[]): void;
  onLensDone?(r: LensResult): void;
  onSynthesized?(r: ReviewResult): void;
  onError?(scope: string, err: unknown): void;
}
```

`grounded_memory_refs` and `citations` reference `RetrievedEntry.entryId` — id arrays keep
`ReviewResult` compact and let both UIs resolve ids against `citations`. (The north-star
requires *visibly citing* a memory.)

## 3. How a lens subagent runs (Option A) vs the rejected alternative

**Option A — parallel Anthropic Messages API (chosen).** Each lens = one `messages.create` with
a system prompt assembled from `soul + ego + rules + lens.role_prompt + that lens's retrieved
memory`; the diff in the user turn. Findings return as JSON via **forced tool use**
(`tools: [emit_findings]`, `tool_choice: {type:"tool", name:"emit_findings"}`). Fan out via
`Promise.allSettled` with a small pool (`p-limit(3)`).

| | Option A (chosen) | Option B (Claude-Code subagents) |
|---|---|---|
| Headless in CI | **Yes** — SDK + API key | **No** — needs Claude Code + interactive parent |
| Parallelism | `Promise.allSettled`, capped | orchestrated by the harness, harder to cap |
| Cost/determinism | predictable; `temperature:0`; cache the shared soul/rules prefix | agentic loop → higher, less predictable |
| Structured output | `tool_use.input` is JSON → Zod gate | coerce via a final "emit JSON" step |

Option B is kept only as a future **local-only** "deep explore" driver behind the same
`LensResult` contract — not in scope.

### 3.1 Control flow (orchestrator → lens → synthesizer)

```ts
async function runReview(req, hooks) {
  const startedAt = isoNow();
  const soul   = await loadSoulStack(req.soulDir);
  const model  = req.modelOverride ?? soul.manifest.models.review;
  const lenses = soul.manifest.lenses.filter(l => l.enabled);

  const diff     = capDiff(req.diff, soul.manifest.limits);     // large-diff guardrail (§4)
  const diffText = renderDiffForPrompt(diff);                   // compact, line-numbered

  const limit = pLimit(3);
  const lensResults = (await Promise.allSettled(lenses.map(lens => limit(async () => {
    const query    = buildLensQuery(lens, diff, req.prContext);
    const memories = await safeRetrieve(query, {                // [] on error / empty journal
      k: soul.manifest.retrieval.top_k, journalDir: soul.journalDir,
      filter: lensTypeFilter(lens),
    });
    hooks?.onRetrieved?.(lens.id, memories);
    const system   = assembleLensSystemPrompt(soul, lens, memories);
    const findings = await callLensSubagent({ model, system, diffText, lens,
                                              prContext: req.prContext, apiKey: req.anthropicApiKey });
    const r = { lens: lens.id, findings, memoriesUsed: memories };
    hooks?.onLensDone?.(r);
    return r;
  })))).map(toLensResultOrError);                               // rejected → {error}, never throws

  const result = await synthesize({ soul, model, lensResults, diff,
                                    prContext: req.prContext, apiKey: req.anthropicApiKey, startedAt });
  hooks?.onSynthesized?.(result);
  return result;
}

async function callLensSubagent(a): Promise<LensFinding[]> {
  const res = await anthropic.messages.create({
    model: a.model, max_tokens: 4096, temperature: 0,
    system: [{ type: "text", text: a.system, cache_control: { type: "ephemeral" } }], // cache soul/rules prefix
    tools: [EMIT_FINDINGS_TOOL],
    tool_choice: { type: "tool", name: "emit_findings" },
    messages: [{ role: "user", content: renderLensUserTurn(a.diffText, a.lens, a.prContext) }],
  });
  const block  = res.content.find(b => b.type === "tool_use");
  const parsed = LensFindingArray.safeParse(block?.input?.findings);   // Zod gate
  if (!parsed.success) return repairOnce(a, parsed.error);             // ≤1 retry, then []
  return parsed.data.map(f => ({ ...f, lens: a.lens.id }));
}
```

`EMIT_FINDINGS_TOOL.input_schema` is the JSONSchema projection of `LensFinding[]` (severity enum,
`file` required, optional `line`/`range`, and `grounded_memory_refs` constrained to the ids of the
memories passed to *that* lens — so it can only cite what it was given). The synthesizer uses the
same mechanism with an `emit_review` tool.

## 4. Prompt assembly

### 4.1 Lens system prompt

```ts
function assembleLensSystemPrompt(soul, lens, mem) {
  return [
    section("IDENTITY (soul.md)", soul.soul),
    section("SELF-MODEL & LENS (ego.md)", soul.ego),
    section("HARD RULES (rules.md — NON-NEGOTIABLE)", soul.rules),
    section(`YOUR REVIEW LENS: ${lens.title}`, lens.role_prompt),
    mem.length
      ? section("RELEVANT MEMORIES (from your journal — cite by [id])", renderMemories(mem))
      : section("MEMORIES", "No prior journal entries apply. Review from first principles; do NOT fabricate memories."),
    section("OUTPUT", [
      "Return findings ONLY via the emit_findings tool.",
      "Anchor every finding to a changed file and (when possible) a new-file line number.",
      "If a finding rests on a memory, put that memory's id in grounded_memory_refs.",
      `Respect severity ceiling: ${lens.severity_ceiling ?? "blocking"}.`,
      "Stay in character; this is YOUR voice, but be concrete and kind.",
    ].join("\n")),
  ].join("\n\n---\n\n");
}
```

`rules.md` is injected verbatim and labeled non-negotiable (policy must dominate persona flavor).
`soul + ego + rules` is the **stable shared prefix across all lenses** → cache it; only
`lens.role_prompt` + memories vary. (FAT-skill/THIN-agent: heavy invariant identity is the fat
asset; the orchestrator just concatenates and caches.) `buildLensQuery` keeps each lens's
retrieval distinct so different lenses surface different memories — what makes the harness's
per-lens panels and the citation interesting.

### 4.2 Synthesizer prompt (one voice, cite memory)

```ts
function assembleSynthSystemPrompt(soul) {
  return [
    section("IDENTITY (soul.md)", soul.soul),
    section("SELF-MODEL (ego.md)", soul.ego),
    section("HARD RULES (rules.md)", soul.rules),
    section("YOUR JOB", [
      `You are ${soul.manifest.persona.display_name}. Internal lenses reviewed this PR.`,
      "Merge their findings into ONE review in a single, consistent voice — yours.",
      "Deduplicate findings on the same file+line+issue (keep the clearest; union their memory refs).",
      "Prioritize: blocking > warning > suggestion > nitpick > info; drop low-value noise.",
      "When a finding is grounded in a memory, reference it inline like “(per [mem-id])” and keep its id in grounded_memory_refs.",
      "Write a short top-level summary in your voice.",
      "Prefix each inline comment with a Conventional-Comments label (e.g. 'suggestion (non-blocking):').",
      "Never invent memories or findings not present in the lens inputs.",
    ].join("\n")),
  ].join("\n\n---\n\n");
}
```

The synth **user turn** carries the structured `LensResult[]` (findings + each lens's
`memoriesUsed`) plus the catalog of all cited `RetrievedEntry` by id, so it can resolve
`[mem-id]` references. Output via `emit_review` → Zod-validated → assembled into `ReviewResult`
(the synthesizer never sets `meta`; the orchestrator fills provenance).

### 4.3 Deterministic-in-code, not model

To keep results stable, do the mechanical parts in code and leave the model the fuzzy merge +
voice:
- **Exact-collision dedupe:** collapse findings with identical `file`+`line`.
- **Severity sort:** order comments `blocking > warning > suggestion > nitpick > info`.
- **Verdict mapping (canonical):** `any blocking → "request_changes"`; else `any
  warning|suggestion → "comment"`; else `"approve"`. (Gated by `features.fail_on_blocking` for
  whether the *check* fails; the Action maps verdict → the Reviews API event.)

## 5. Failure modes & guardrails (fail soft — never crash the PR)

| Failure | Guardrail |
|---|---|
| Anthropic 429/529 | SDK retry + backoff; `p-limit(3)`. A lens that still fails → `LensResult.error`, contributes 0 findings; the review ships from the rest. |
| Large diff | `capDiff` enforces `manifest.limits` (drop lowest-signal files first: lockfiles/generated/vendored), `diff.truncated = true`, the review body states what was skipped. Never send an unbounded diff. |
| No journal / empty retrieval | Lenses review "from first principles"; prompt forbids fabricating memories; `citations` empty; review opens with a first-run notice. |
| `retrieve()` error | `safeRetrieve` returns `[]` (degrade to no-memory) rather than aborting the lens; logged to `meta`. |
| Malformed model JSON | Zod gate + **one** repair retry (re-prompt with the validation error); still bad → that lens yields `[]`, not a crash. |
| Synthesizer fails | Deterministic code-side merge: concat findings, collapse exact dups, sort by severity, emit a `ReviewResult` with a templated (voiceless but correct) summary. The PR still gets a useful review. |

**Principle:** a partial review always beats a crashed PR. Every error path narrows scope and
annotates `meta.lensErrors`, surfaced in both the PR body and the harness provenance panel.

## Open questions / TODOs

- Confirm exact `loadSoulStack`/`retrieve` signatures against the sibling docs (field names,
  whether `openaiApiKey` flows through `ReviewRequest` or is index-time only).
- Lens registry + default `type` filters (`lensTypeFilter`): the architecture→`decision|formative`,
  style→`lesson|reflection` mapping is a strawman — enumerate per persona.
- Whether to expose the originating `lens` in the PR comment (transparency) or hide it for a
  cleaner single voice. Leaning: hide on the PR, keep it in the harness.
- Prompt-cache minimum-token threshold for the cached soul/rules prefix; pin the default model id.
- Line-mapping policy for findings on unchanged context lines — see [`action-and-harness.md`](./action-and-harness.md) (leaning: demote to the review body).
