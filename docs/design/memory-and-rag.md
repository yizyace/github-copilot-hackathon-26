# Soul Review — Memory & Retrieval (RAG)

> Status: **DESIGN** — committed spec for the journal memory store + retrieval. Ready to build against.
> Proposed product · Last updated 2026-06-04 · Part of [the design set](./README.md).

Scope: how `.soul/journal/*.md` (format in [`soul-stack-format.md`](./soul-stack-format.md))
is embedded, stored, and retrieved. This doc owns the **`RetrievedEntry`** type and the
**`retrieve()`** contract that [`runtime-and-subagents.md`](./runtime-and-subagents.md) consumes.

**Stack:** Node + TypeScript, `better-sqlite3` + `sqlite-vec`, OpenAI `text-embedding-3-small`
(1536-dim), `gray-matter` + `zod`. **Style anchor:** mirror the user's `judge-me-bro/harness/store.ts` —
a single `Store`-like class is the only module that touches SQLite (`migrate()` via `db.exec`,
named-param prepared statements, `ON CONFLICT DO UPDATE` upserts, WAL, `:memory:` in tests).
Corpus is small (tens–low hundreds of entries), so brute-force KNN is fine — **do not build ANN.**

## 0. Module layout

Lives under `tools/soul-review/src/memory/`. One `MemoryStore` class owns the DB connection;
a thin functional layer sits on top.

```
tools/soul-review/src/memory/
  db.ts          # MemoryStore: open + load sqlite-vec, migrate(), low-level upsert/query
  embed.ts       # Embedder iface + OpenAIEmbedder + HashEmbedder (fallback) + factory
  chunk.ts       # parse .soul/journal/*.md -> JournalChunk[]  (gray-matter + zod frontmatter)
  ingest.ts      # parse -> chunk -> (hash-cache) -> embed -> upsert  (idempotent)
  retrieve.ts    # retrieve(query, opts): the public contract; vec OR fts backend
  query.ts       # build retrieval query / sub-queries from a PR diff + soul/ego context
  schemas.ts     # zod JournalFrontmatter + RetrievedEntry types
  memory.test.ts
```

Two backends satisfy **one** `retrieve()` contract — chosen once at open time from
`OPENAI_API_KEY` presence (overridable):
- **`vec`** — embeddings present → `sqlite-vec` brute-force KNN.
- **`fts`** — no key → SQLite FTS5 lexical (BM25).

## 1. SQLite schema

Three real tables + two virtual tables. `chunk` holds metadata + content + hash; `vec_chunk`
holds the float32 embedding keyed by the same rowid; `fts_chunk` is the lexical index; `meta`
records the embedding model+dims so a DB built with one embedder is never queried with another.

```sql
-- Provenance / guardrail. seeded: ('embed_model','text-embedding-3-small'),
-- ('embed_dims','1536'), ('backend','vec'|'fts'), ('schema_version','1')
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- One row per embeddable chunk. Default chunking = one chunk per entry (§2), so
-- chunk_index is 0; the column exists so per-section is a data-only change later.
CREATE TABLE IF NOT EXISTS chunk (
  rowid         INTEGER PRIMARY KEY,        -- explicit: the join key for vec_chunk/fts_chunk
  chunk_id      TEXT NOT NULL UNIQUE,       -- "<entry_id>#<chunk_index>" — stable idempotent key
  entry_id      TEXT NOT NULL,              -- frontmatter.id of the source journal entry
  chunk_index   INTEGER NOT NULL DEFAULT 0,
  type          TEXT NOT NULL,              -- decision|reflection|lesson|interaction|formative
  title         TEXT,
  date          TEXT,
  files_touched TEXT NOT NULL DEFAULT '[]', -- JSON array
  tags          TEXT NOT NULL DEFAULT '[]', -- JSON array
  related_pr    TEXT,
  summary       TEXT,                       -- frontmatter.summary (the headline)
  content       TEXT NOT NULL,              -- the exact text embedded (see §2)
  content_hash  TEXT NOT NULL,              -- sha256(embed_model + content). Cache key.
  source_path   TEXT NOT NULL,              -- .soul/journal/<file>.md
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chunk_type  ON chunk(type);
CREATE INDEX IF NOT EXISTS idx_chunk_entry ON chunk(entry_id);
CREATE INDEX IF NOT EXISTS idx_chunk_hash  ON chunk(content_hash);

-- sqlite-vec virtual table. rowid shared 1:1 with chunk.rowid. Aux (+) columns let us
-- filter inside the KNN query without a JOIN.
CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunk USING vec0(
  embedding float[1536],
  +type     TEXT,
  +entry_id TEXT
);

-- FTS5 fallback (recommend PLAIN, not external-content, to avoid the delete-sync trap).
CREATE VIRTUAL TABLE IF NOT EXISTS fts_chunk USING fts5(
  summary, title, tags, content, tokenize='porter unicode61'
);
```

**Invariant:** `chunk.rowid` is declared explicitly because the two virtual tables join to it
by rowid. Every `chunk` insert must capture `lastInsertRowid` and reuse it for `vec_chunk`/
`fts_chunk`. `vec0` needs the dimension as a literal (`float[1536]`) — keep it in sync with
`meta.embed_dims`; on open, if a queried DB's dims ≠ the embedder's, **fail loud**.

### 1.1 Filter composition (sqlite-vec specifics)

KNN uses a `MATCH` + `k`:
```sql
SELECT rowid, distance FROM vec_chunk
WHERE embedding MATCH :queryVec AND k = :k ORDER BY distance;
```

- **(A) Filter-during-KNN via aux columns** — for low-cardinality filters (`type`, `entry_id`),
  which are `+` columns on `vec0`, add the predicate to the same query; `k` counts post-filter:
  ```sql
  SELECT rowid, distance FROM vec_chunk
  WHERE embedding MATCH :queryVec AND k = :k AND type IN ('lesson','decision')
  ORDER BY distance;
  ```
- **(B) KNN-then-filter via JOIN** — for JSON/array filters (`files_touched`, `tags`), over-fetch
  (`k = k * overfetch`, ×4) then join `chunk` and filter with `json_each`:
  ```sql
  WITH knn AS (
    SELECT rowid, distance FROM vec_chunk
    WHERE embedding MATCH :queryVec AND k = :overfetchK AND type IN (...)
  )
  SELECT c.*, knn.distance FROM knn JOIN chunk c ON c.rowid = knn.rowid
  WHERE (:hasFileFilter = 0 OR EXISTS (
           SELECT 1 FROM json_each(c.files_touched) f WHERE f.value IN (/* changed files */)))
  ORDER BY knn.distance LIMIT :k;
  ```

**Rule:** low-cardinality filters → aux pre-filter (A); JSON/array filters → post-KNN with
over-fetch (B). On a small corpus, over-fetch ×4 never under-fills.

**sqlite-vec gotchas to record:** a `MATCH` query **must** include `k = :k` (or `LIMIT`); you
**cannot** `OR` a `MATCH` with other predicates (KNN must be the driving table → the CTE form).
`text-embedding-3-small` vectors are normalized, so cosine ≈ L2; expose `distance` (raw L2) and
a normalized `score = clamp(1 - distance/2, 0, 1)`.

## 2. Chunking strategy

**Default: one chunk per entry.** The corpus is tiny; the unit of meaning the reviewer wants
is the whole lesson, not a paragraph. Per-section chunking would fragment context — keep it as
a documented escape hatch (split body on `##`, emit `chunk_index = 0..n`, repeat the frontmatter
header into each section), enabled only if entries grow long (the schema already supports it).

**Embedded `content`** = a structured concat so file paths and tags pull semantically too:
```ts
embedText(e) =
  `# ${e.title}\n` +
  `type: ${e.type}\n` +
  (e.tags?.length          ? `tags: ${e.tags.join(", ")}\n` : "") +
  (e.files_touched?.length ? `files: ${e.files_touched.join(", ")}\n` : "") +
  (e.summary               ? `summary: ${e.summary}\n\n` : "\n") +
  e.body.trim()
```
The PR-diff query's strongest signal is filenames/identifiers, so embedding `files`/`tags` into
the text (in addition to keeping them as filter columns) makes path overlap pull via the vector
too. Soft-cap `content` at ~1,500 tokens; if you hit it regularly, that's the signal to switch
to per-section chunking.

## 3. Ingestion pipeline (idempotent, hash-cached)

`content_hash = sha256(embed_model + "\n" + content)` — folding the model into the hash means
switching models invalidates the cache automatically (you can never serve vectors from the
wrong model). Before embedding, look up `chunk_id`; if the stored hash matches, **skip embedding
and upsert entirely** (cache hit). Upsert by `chunk_id`; on a hash change, re-embed and refresh
the satellite rows for that rowid; reconcile deletions by set-difference.

```ts
async function ingest(journalDir, store, embedder) {
  store.assertEmbedderMatches(embedder);              // dims+model vs meta; fail loud on mismatch
  const chunks = glob(`${journalDir}/*.md`).flatMap(parseEntry);  // gray-matter + zod + embedText()
  const fresh  = chunks.filter(c => !store.isUnchanged(c.chunkId, c.contentHash));

  if (embedder.kind === "vec") {
    for (const batch of chunked(fresh, 128)) {
      const vecs = await embedder.embedBatch(batch.map(c => c.content));   // OpenAI batch
      batch.forEach((c, i) => store.upsertChunk(c, vecs[i]));
    }
  } else {
    fresh.forEach(c => store.upsertChunk(c, null));   // fts: metadata + fts only
  }
  store.deleteMissing(new Set(chunks.map(c => c.chunkId)));   // drop entries removed from disk
  store.setMeta("backend", embedder.kind);
  return store.stats();                                // { inserted, updated, unchanged, deleted }
}
```

`upsertChunk` runs in one transaction per entry: update/insert `chunk`, capture `rowid`, then
`INSERT INTO vec_chunk(rowid, embedding, type, entry_id)` (better-sqlite3 binds a `Float32Array`)
and `INSERT INTO fts_chunk(rowid, summary, title, tags, content)`.

## 4. The retrieval contract

```ts
export type JournalType = "decision" | "reflection" | "lesson" | "interaction" | "formative";

export interface RetrieveFilter {
  type?: JournalType | JournalType[];   // → vec aux pre-filter (strategy A)
  files?: string[];                      // repo-relative paths; post-KNN json_each filter (B)
  tags?: string[];                       // post-KNN json_each filter (B)
}
export interface RetrieveOpts {
  k: number;
  filter?: RetrieveFilter;
  overfetch?: number;                    // multiplier for strategy B (default 4)
  backend?: "vec" | "fts" | "auto";      // default "auto" (resolved at open)
}

// THE canonical memory type — used verbatim by the runtime (ReviewResult.citations etc.).
export interface RetrievedEntry {
  chunkId: string;
  entryId: string;                       // referenced by grounded_memory_refs / citations
  type: JournalType;
  title: string | null;
  date: string | null;
  summary: string | null;
  content: string;                       // full embedded text (for injection / trimming)
  filesTouched: string[];
  tags: string[];
  relatedPr: string | null;
  sourcePath: string;
  score: number;                         // 0..1, higher = better (normalized across backends)
  distance: number | null;               // raw L2 (vec) or null (fts)
  backend: "vec" | "fts";
  matchReason?: string;                  // debug: "vec-knn" | "fts-bm25" | "file-overlap-boost"
}

export interface Retriever {
  retrieve(query: string, opts: RetrieveOpts): Promise<RetrievedEntry[]>;
  retrieveForDiff(diff: PrDiff, ctx: SoulEgoContext, opts: DiffRetrieveOpts): Promise<RetrievedEntry[]>;
}
```

`score` is the unifying field (vec: `1 - distance/2`; fts: min-max-normalized BM25) so callers
never branch on backend.

### 4.1 PR diff → query (multi sub-query, per-lens)

One concatenated blob embeds poorly (it averages many topics). **Fan out into focused
sub-queries, retrieve each, then merge.** Three axes:

1. **Per-changed-file** (top ~5 by hunk size): query = `path + top identifiers + nearby comments`;
   filter `{ files: [path, …basename variants] }` so the journal's `files_touched` hits directly.
2. **One whole-PR query** = `PR title + body + most-changed identifiers`; no file filter — catches
   non-file-scoped lessons (architecture decisions, "we always do X").
3. **Per-lens query (the subagents)** = `lens.role_prompt + diff summary`, optionally filtered by
   `type` (e.g. an architecture lens filters `decision|formative`; a style lens filters
   `lesson|reflection`). **This is how each lens subagent retrieves its own memory slice** — it
   calls `retrieve()` with its own query + filter, not a shared global top-k.

Merge (`query.ts`): reciprocal-rank fusion (RRF, `c = 60`) across sub-queries, a small
file-overlap score boost, dedupe by `entryId` (keep best chunk per entry), sort, slice to the
global `k`. RRF fuses heterogeneous lists without needing comparable absolute scores (~10 lines).
A lens wanting its own unmerged slice just calls `retrieve()` directly.

## 5. Index lifecycle in a GitHub Action

The DB is a build artifact derived from `.soul/journal/`.

| Option | Per-run cost | Freshness | Repo |
|---|---|---|---|
| A. Commit prebuilt `memory.db` | ~0 | stale until re-committed; binary merge conflicts | binary blob in git (bad) |
| B. Rebuild every run | full embed each run | always fresh | clean |
| **C. `actions/cache` keyed by journal hash** | embed only changed entries; restore is seconds | fresh (key changes with journal) | clean |

**Canonical: C** (with B as the zero-config fallback). Cache key = hash of the journal dir +
embedder model:
```yaml
- uses: actions/cache@v4
  with:
    path: .soul/memory.db
    key:          soul-mem-${{ hashFiles('.soul/journal/**/*.md') }}-emb-3-small
    restore-keys: soul-mem-
- run: node tools/soul-review/dist/cli.js ingest    # idempotent; no-op on full cache hit
```
Journal unchanged → cache hit → `ingest()` is a no-op (every chunk is a hash hit) → **zero
embedding calls, sub-second.** Journal changed → key miss → restore nearest older DB via
`restore-keys` → re-embed only changed entries. **Named fallback for demo determinism:** commit
a prebuilt `memory.db`. `memory.db` is gitignored by default. Locally (harness/tests), `memory.db`
sits at `.soul/memory.db`; tests use `:memory:` + `HashEmbedder` (no network, no key).

## 6. No-API-key fallback (lexical / FTS5)

With no `OPENAI_API_KEY`, the store opens in **`fts` backend** and `retrieve()` runs FTS5 BM25 —
*same contract, same `RetrievedEntry[]`*:
```sql
SELECT c.*, bm25(fts_chunk) AS rank
FROM fts_chunk JOIN chunk c ON c.rowid = fts_chunk.rowid
WHERE fts_chunk MATCH :ftsQuery          -- e.g.  "auth.ts" OR token OR "rate limit"
  AND (:hasType = 0 OR c.type IN (...))
ORDER BY rank LIMIT :k;                   -- bm25 lower=better; normalize to score 0..1
```
Metadata filters compose as in strategy B; `score` is normalized BM25; `distance` is null;
`backend` is `"fts"`.

A second fallback, `HashEmbedder` (deterministic feature-hash → 1536-dim, L2-normalized), lets the
**vec** code path run with no network for tests/offline demos (not semantically meaningful — the
FTS path is the real no-key retrieval). Factory: real key → `OpenAIEmbedder`; `MEMORY_FAKE_EMBED=1`
→ `HashEmbedder`; else → `fts`. Backend is chosen at open and recorded in `meta.backend`;
`retrieve()` dispatches on it. A vec-built DB can *degrade* to FTS at query time (the `fts_chunk`
table is always populated), but not vice-versa — **prefer building with the key when available.**

## 7. Cost / latency & token budgeting

**Embedding (`text-embedding-3-small`, ~200 short entries):** ~250 tokens/entry → ~50k tokens →
**~$0.001** for a full rebuild (pricing $0.02/1M). Per-PR incremental (cache C): only changed
entries → effectively $0, often *zero* calls. Latency: one batched call returns ~1–2 s; warm/FTS
runs make **zero** network calls. Query-time: ~3–8 short sub-query embeds per PR, parallelized →
~1–2 s.

**Token budgeting (the expensive part is injection, not retrieval):**
- Cap injected memory to a fixed budget (default ~2,000 tokens, `retrieval.max_journal_context`).
- Inject the **`summary`** as a compact card by default — `[<type>] <title> (<date>, PR <n>) — <summary> · files: …` — only expand to full `content` for the top 2–3 (or hard-pointed) entries.
- Greedy fill by `score`; stop at the budget; drop the tail. Per-lens slices get a sub-budget so one lens can't crowd the prompt.

## Open questions / TODOs

- **`sqlite-vec` native load on CI:** confirm the prebuilt extension loads via `better-sqlite3`
  `loadExtension` on `ubuntu-latest` (must be built with load-extension enabled). **FTS is the
  safety net** if it won't — ship the demo on FTS if needed.
- **FTS5 table shape:** plain (recommended, dup `content`) vs external-content (no dup, but a
  delete-sync trap). Revisit if the corpus grows.
- **Diff parser & identifier extraction:** parse unified `git diff` vs the GitHub API `files`
  payload; regex on `+` lines vs a light tree-sitter pass. Affects sub-query quality most.
- **`SoulEgoContext` contribution:** how much soul/ego text to fold into the whole-PR sub-query,
  and whether it should bias per-lens `type` filters. Needs [`runtime-and-subagents.md`](./runtime-and-subagents.md).
- **Score tuning:** validate `1 - distance/2`, tune the file-overlap boost and RRF `c` on real PRs.
- **Rerank:** a cross-encoder/LLM rerank over the fused top-k is the obvious quality lever if time
  remains — likely out of scope for the hackathon.
