/**
 * diffPositions — map PatternBuddy findings onto commentable GitHub diff
 * positions so inline PR-review comments never get rejected.
 *
 * The GitHub Reviews API (`octokit.pulls.createReview`, `comments[]`) only
 * accepts an inline comment when its target line is part of the unified diff.
 * A SINGLE off-diff comment makes GitHub 422 the *entire* review, so we never
 * hand a finding's raw line number straight to the API. Instead we:
 *
 *   1. Parse the PR's whole unified diff (one multi-file string) into the exact
 *      set of commentable RIGHT-side positions, keyed by "path:line" — the index.
 *   2. For each finding, decide whether it is:
 *        - 'inline'   → commentable as-is (emit a real inline comment; multi-line
 *                       when both endpoints are commentable on the RIGHT side),
 *        - 'snap'     → not commentable, but a commentable RIGHT-side line exists
 *                       within ±3 (snap to the nearest; remember the original line),
 *        - 'fallback' → not commentable at all / file absent (caller rolls it into
 *                       the summary body).
 *
 * Nothing is ever silently dropped.
 *
 * We only ever target the RIGHT side (new-file line numbers), because findings
 * carry new-file line ranges and we comment on added/context lines.
 *
 * Unified-diff grammar this module relies on:
 *   `diff --git a/<p> b/<p>`  → start of a new file section
 *   `--- a/<p>`               → old-file header (ignored)
 *   `+++ b/<p>`               → new-file header; `+++ /dev/null` = deleted file
 *                               (no RIGHT side → skipped for inline)
 *   `@@ -oldStart,oldCount +newStart,newCount @@`  → hunk header
 *     ' ' context  → present on both sides: advance old & new (commentable @ new)
 *     '+' added    → present on the new file only: advance new (commentable @ new)
 *     '-' removed  → present on the old file only: advance old (LEFT — skipped)
 *     '\'          → "\ No newline at end of file" marker; consumes nothing.
 */

/** A resolved, commentable position. We only emit RIGHT-side comments. */
export interface DiffPosition {
  path: string;
  line: number;
  side: 'RIGHT';
}

/**
 * Commentable RIGHT-side positions for a whole (multi-file) unified diff.
 *
 *   - `commentable`: fast membership test, keyed by "path:line".
 *   - `byFile`:      path → sorted ascending RIGHT-side lines, for snapping.
 */
export interface DiffIndex {
  commentable: Set<string>;
  byFile: Map<string, number[]>;
}

/**
 * Minimal finding shape this module consumes. Intentionally decoupled from the
 * package's `Finding` type so the mapper stays a pure, dependency-free utility.
 * `lineStart`/`lineEnd` are NEW-file (RIGHT-side) line numbers, inclusive.
 */
export interface FindingLike {
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * Outcome of mapping one finding onto the diff.
 *
 *   - inline:   commentable as-is. `line` = `lineEnd`. `startLine` present only
 *               for a valid multi-line span (both endpoints commentable, start <
 *               line); absent means a single-line comment on `line`.
 *   - snap:     not commentable, but a commentable RIGHT-side line was within ±3.
 *               `line` = the snapped line; `originalLine` = the finding's `lineEnd`.
 *   - fallback: nothing commentable within ±3 (or the file is not in the diff).
 *               `originalLine` = the finding's `lineEnd`; caller rolls it up.
 */
export type MappedFinding =
  | { kind: 'inline'; path: string; line: number; startLine?: number; side: 'RIGHT' }
  | { kind: 'snap'; path: string; line: number; side: 'RIGHT'; originalLine: number }
  | { kind: 'fallback'; path: string; originalLine: number };

/** Lines within this radius are eligible for snapping. */
export const SNAP_RADIUS = 3;

const SIDE: 'RIGHT' = 'RIGHT';

function key(path: string, line: number): string {
  return `${path}:${line}`;
}

const DIFF_GIT_RE = /^diff --git /;
const NEW_FILE_RE = /^\+\+\+ (.+)$/;
const HUNK_RE = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Strip the `b/` (or `a/`) prefix Git puts on diff paths so the result matches
 * the bare repo-relative paths findings use (e.g. `src/foo.ts`). Quoted paths
 * (those containing spaces/specials) are left as-is after prefix removal.
 */
function normalizeNewPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '/dev/null') return null; // deleted file: no RIGHT side
  if (trimmed.startsWith('b/')) return trimmed.slice(2);
  if (trimmed.startsWith('a/')) return trimmed.slice(2);
  return trimmed;
}

/**
 * Build the commentable RIGHT-side index from a single multi-file unified diff.
 *
 * The diff is walked line by line. A `+++ b/<path>` line opens the current
 * file's RIGHT side (or closes it off when `/dev/null`). Within each `@@` hunk
 * we advance the new-file counter and record context (' ') and added ('+')
 * lines as commentable.
 */
export function buildDiffIndex(unifiedDiff: string): DiffIndex {
  const index: DiffIndex = { commentable: new Set(), byFile: new Map() };
  if (!unifiedDiff) return index;

  const lines = unifiedDiff.split('\n');

  let currentPath: string | null = null; // null = no RIGHT side (preamble/deleted)
  let newLine = 0;
  let inHunk = false;

  const mark = (path: string, line: number): void => {
    const k = key(path, line);
    if (index.commentable.has(k)) return;
    index.commentable.add(k);
    const arr = index.byFile.get(path);
    if (arr) arr.push(line);
    else index.byFile.set(path, [line]);
  };

  for (const raw of lines) {
    // New file section: reset hunk state until we see its `+++` header.
    if (DIFF_GIT_RE.test(raw)) {
      currentPath = null;
      inHunk = false;
      continue;
    }

    // New-file header decides whether this file has a commentable RIGHT side.
    const newFile = NEW_FILE_RE.exec(raw);
    if (newFile) {
      currentPath = normalizeNewPath(newFile[1]);
      inHunk = false;
      continue;
    }

    // Old-file header — ignore (but don't let its leading '-' be miscounted).
    if (raw.startsWith('--- ')) continue;

    const hunk = HUNK_RE.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      inHunk = true;
      continue;
    }

    // A blank line is never a valid in-hunk body line (those start with ' ',
    // '+', '-' or '\'). It marks the end of the current hunk — e.g. the trailing
    // newline at EOF or a separator before the next section. End the hunk so the
    // empty string isn't miscounted as a context line.
    if (raw === '') {
      inHunk = false;
      continue;
    }

    // Outside a hunk, or in a deleted/headerless file: nothing to record.
    if (!inHunk || currentPath === null) continue;

    const marker = raw[0];
    if (marker === '+') {
      mark(currentPath, newLine);
      newLine++;
    } else if (marker === '-') {
      // Removed line: LEFT side only — not commentable on the RIGHT.
    } else if (marker === '\\') {
      // "\ No newline at end of file": consumes no line on either side.
    } else {
      // Context line (' '): present on both sides; commentable on the RIGHT.
      mark(currentPath, newLine);
      newLine++;
    }
  }

  for (const arr of index.byFile.values()) {
    arr.sort((a, b) => a - b);
  }

  return index;
}

/** Is `(path, line)` a commentable RIGHT-side position? */
export function isCommentable(index: DiffIndex, path: string, line: number): boolean {
  return index.commentable.has(key(path, line));
}

/**
 * Nearest commentable RIGHT-side line to `line` within `radius`, or null.
 * Tie-break: smaller distance first, then the smaller line number (so results
 * are deterministic). `byFile` is sorted ascending, so the first candidate at
 * the best distance is already the smallest line number.
 */
export function nearestCommentable(
  index: DiffIndex,
  path: string,
  line: number,
  radius: number = SNAP_RADIUS,
): number | null {
  const arr = index.byFile.get(path);
  if (!arr || arr.length === 0) return null;
  let best: number | null = null;
  let bestDist = Infinity;
  for (const candidate of arr) {
    const dist = Math.abs(candidate - line);
    if (dist > radius) continue;
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
      if (bestDist === 0) break; // exact hit can't be beaten
    }
  }
  return best;
}

/**
 * Map one finding onto a valid review position.
 *
 * Anchor is `lineEnd` (the end of the finding's range). Multi-line: include
 * `startLine` only when BOTH endpoints are commentable on the RIGHT side and
 * `lineStart < lineEnd`; otherwise collapse to a single-line comment on
 * `lineEnd` (and snap that if it isn't commentable).
 */
export function mapFinding(finding: FindingLike, index: DiffIndex): MappedFinding {
  const { filePath, lineStart, lineEnd } = finding;

  const endCommentable = isCommentable(index, filePath, lineEnd);

  // --- Multi-line inline: both endpoints commentable on RIGHT, start < end. ---
  if (
    endCommentable &&
    lineStart < lineEnd &&
    isCommentable(index, filePath, lineStart)
  ) {
    return { kind: 'inline', path: filePath, line: lineEnd, startLine: lineStart, side: SIDE };
  }

  // --- Single-line inline (anchor commentable; collapse any multi-line span). ---
  if (endCommentable) {
    return { kind: 'inline', path: filePath, line: lineEnd, side: SIDE };
  }

  // --- Snap to the nearest commentable RIGHT-side line within ±3. ---
  const snapped = nearestCommentable(index, filePath, lineEnd);
  if (snapped !== null) {
    return { kind: 'snap', path: filePath, line: snapped, side: SIDE, originalLine: lineEnd };
  }

  // --- Nothing nearby / file absent → caller rolls it into the summary. ---
  return { kind: 'fallback', path: filePath, originalLine: lineEnd };
}
