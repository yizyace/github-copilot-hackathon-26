import { describe, it, expect } from 'vitest';
import {
  buildDiffIndex,
  mapFinding,
  isCommentable,
  nearestCommentable,
  SNAP_RADIUS,
  type DiffIndex,
  type FindingLike,
} from './diffPositions';

/**
 * Fixture: src/foo.ts, one hunk.
 *   new 10  ' context A'   commentable
 *   (—)     '-removed X'   LEFT only
 *   new 11  '+added one'   commentable
 *   new 12  '+added two'   commentable
 *   new 13  ' context B'   commentable
 *   new 14  ' context C'   commentable
 * RIGHT-side commentable new lines: 10,11,12,13,14
 * (new-side count = 3 context + 2 added = 5)
 */
const FOO_DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index abc1234..def5678 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -10,4 +10,5 @@ class Foo {
 context A
-removed X
+added one
+added two
 context B
 context C
`;

const finding = (
  filePath: string,
  lineStart: number,
  lineEnd: number,
): FindingLike => ({ filePath, lineStart, lineEnd });

describe('buildDiffIndex', () => {
  it('records exactly the RIGHT-side (context + added) lines, sorted', () => {
    const index = buildDiffIndex(FOO_DIFF);
    expect(index.byFile.get('src/foo.ts')).toEqual([10, 11, 12, 13, 14]);
    // removed line (old side) is never commentable on the RIGHT
    expect(isCommentable(index, 'src/foo.ts', 9)).toBe(false);
    expect(isCommentable(index, 'src/foo.ts', 15)).toBe(false);
    for (const line of [10, 11, 12, 13, 14]) {
      expect(isCommentable(index, 'src/foo.ts', line)).toBe(true);
    }
  });

  it('returns an empty index for empty input', () => {
    const index = buildDiffIndex('');
    expect(index.commentable.size).toBe(0);
    expect(index.byFile.size).toBe(0);
  });

  it('strips the b/ prefix to bare repo-relative paths', () => {
    const index = buildDiffIndex(FOO_DIFF);
    expect(index.byFile.has('src/foo.ts')).toBe(true);
    expect(index.byFile.has('b/src/foo.ts')).toBe(false);
  });
});

describe('mapFinding — inline', () => {
  it('maps an exact added line to a single-line inline comment on RIGHT', () => {
    const index = buildDiffIndex(FOO_DIFF);
    const result = mapFinding(finding('src/foo.ts', 11, 11), index);
    expect(result).toEqual({
      kind: 'inline',
      path: 'src/foo.ts',
      line: 11,
      side: 'RIGHT',
    });
    // single-line: no startLine
    expect((result as { startLine?: number }).startLine).toBeUndefined();
  });

  it('maps a context line to a commentable inline comment', () => {
    const index = buildDiffIndex(FOO_DIFF);
    // line 13 is a context (unchanged) line — still commentable on RIGHT
    const result = mapFinding(finding('src/foo.ts', 13, 13), index);
    expect(result).toMatchObject({ kind: 'inline', path: 'src/foo.ts', line: 13, side: 'RIGHT' });
  });
});

describe('mapFinding — multi-line eligibility', () => {
  it('keeps startLine when both endpoints are commentable and start < end', () => {
    const index = buildDiffIndex(FOO_DIFF);
    const result = mapFinding(finding('src/foo.ts', 11, 13), index);
    expect(result).toEqual({
      kind: 'inline',
      path: 'src/foo.ts',
      line: 13,
      startLine: 11,
      side: 'RIGHT',
    });
  });

  it('collapses to single-line when the start endpoint is NOT commentable', () => {
    const index = buildDiffIndex(FOO_DIFF);
    // start 9 is off-diff, end 12 is commentable → collapse to single-line on 12
    const result = mapFinding(finding('src/foo.ts', 9, 12), index);
    expect(result).toEqual({
      kind: 'inline',
      path: 'src/foo.ts',
      line: 12,
      side: 'RIGHT',
    });
    expect((result as { startLine?: number }).startLine).toBeUndefined();
  });

  it('does not emit startLine when start === end', () => {
    const index = buildDiffIndex(FOO_DIFF);
    const result = mapFinding(finding('src/foo.ts', 12, 12), index);
    expect((result as { startLine?: number }).startLine).toBeUndefined();
  });
});

describe('mapFinding — snap (±3, nearest, tie-break)', () => {
  it('snaps an off-diff end line to the nearest commentable line within ±3', () => {
    const index = buildDiffIndex(FOO_DIFF);
    // 16 is off-diff; nearest commentable within 3 is 14 (distance 2)
    const result = mapFinding(finding('src/foo.ts', 16, 16), index);
    expect(result).toEqual({
      kind: 'snap',
      path: 'src/foo.ts',
      line: 14,
      side: 'RIGHT',
      originalLine: 16,
    });
  });

  it('tie-breaks equal distances toward the smaller line number', () => {
    // Custom fixture: commentable RIGHT lines 10 and 14; target 12 is
    // equidistant (±2). Tie-break → snap to the smaller line, 10.
    const tieDiff = `diff --git a/t.ts b/t.ts
index 1..2 100644
--- a/t.ts
+++ b/t.ts
@@ -10,1 +10,1 @@
+ten
@@ -14,1 +14,1 @@
+fourteen
`;
    const index = buildDiffIndex(tieDiff);
    expect(index.byFile.get('t.ts')).toEqual([10, 14]);
    const result = mapFinding(finding('t.ts', 12, 12), index);
    expect(result).toEqual({
      kind: 'snap',
      path: 't.ts',
      line: 10,
      side: 'RIGHT',
      originalLine: 12,
    });
  });

  it('snaps based on the end line (anchor) even for a multi-line finding', () => {
    const index = buildDiffIndex(FOO_DIFF);
    // end 16 off-diff → snaps to 14; originalLine is the end (16)
    const result = mapFinding(finding('src/foo.ts', 11, 16), index);
    expect(result).toMatchObject({ kind: 'snap', line: 14, originalLine: 16 });
  });
});

describe('mapFinding — fallback', () => {
  it('falls back when nothing is commentable within ±3', () => {
    const index = buildDiffIndex(FOO_DIFF);
    // 100 is far from any commentable line
    const result = mapFinding(finding('src/foo.ts', 100, 100), index);
    expect(result).toEqual({
      kind: 'fallback',
      path: 'src/foo.ts',
      originalLine: 100,
    });
  });

  it('falls back when the file is absent from the diff', () => {
    const index = buildDiffIndex(FOO_DIFF);
    const result = mapFinding(finding('src/nope.ts', 11, 11), index);
    expect(result).toEqual({
      kind: 'fallback',
      path: 'src/nope.ts',
      originalLine: 11,
    });
  });

  it('respects SNAP_RADIUS exactly (distance === radius snaps, > radius falls back)', () => {
    const index = buildDiffIndex(FOO_DIFF);
    // nearest commentable is 14; 14 + SNAP_RADIUS = 17 snaps, 18 does not
    expect(mapFinding(finding('src/foo.ts', 14 + SNAP_RADIUS, 14 + SNAP_RADIUS), index)).toMatchObject({
      kind: 'snap',
      line: 14,
    });
    expect(mapFinding(finding('src/foo.ts', 14 + SNAP_RADIUS + 1, 14 + SNAP_RADIUS + 1), index)).toMatchObject({
      kind: 'fallback',
    });
  });
});

describe('multi-file unified diff', () => {
  const MULTI_DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index aaa..bbb 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,2 +1,3 @@
 alpha
+beta
 gamma
diff --git a/src/bar.ts b/src/bar.ts
index ccc..ddd 100644
--- a/src/bar.ts
+++ b/src/bar.ts
@@ -50,2 +50,3 @@
 fifty
+fifty-one
 fifty-two
`;

  it('indexes each file section independently', () => {
    const index = buildDiffIndex(MULTI_DIFF);
    // foo: new lines 1 (context 'alpha'), 2 (added 'beta'), 3 (context 'gamma')
    expect(index.byFile.get('src/foo.ts')).toEqual([1, 2, 3]);
    // bar: new lines 50 (context), 51 (added), 52 (context)
    expect(index.byFile.get('src/bar.ts')).toEqual([50, 51, 52]);
  });

  it('maps findings against the correct file in a multi-file diff', () => {
    const index = buildDiffIndex(MULTI_DIFF);
    expect(mapFinding(finding('src/foo.ts', 2, 2), index)).toMatchObject({
      kind: 'inline',
      path: 'src/foo.ts',
      line: 2,
    });
    expect(mapFinding(finding('src/bar.ts', 51, 51), index)).toMatchObject({
      kind: 'inline',
      path: 'src/bar.ts',
      line: 51,
    });
    // a foo line number that only exists in bar must NOT cross-match
    expect(mapFinding(finding('src/foo.ts', 51, 51), index)).toMatchObject({
      kind: 'fallback',
      path: 'src/foo.ts',
    });
  });
});

describe('deleted files (/dev/null) and new files', () => {
  it('skips deleted files (no RIGHT side) entirely', () => {
    const DELETED_DIFF = `diff --git a/src/gone.ts b/src/gone.ts
deleted file mode 100644
index eee..0000000
--- a/src/gone.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-line one
-line two
-line three
`;
    const index = buildDiffIndex(DELETED_DIFF);
    expect(index.byFile.has('src/gone.ts')).toBe(false);
    expect(index.commentable.size).toBe(0);
    expect(mapFinding(finding('src/gone.ts', 1, 1), index)).toEqual({
      kind: 'fallback',
      path: 'src/gone.ts',
      originalLine: 1,
    });
  });

  it('indexes brand-new files (all added lines commentable on RIGHT)', () => {
    const NEW_FILE_DIFF = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 0000000..fff
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+export const a = 1;
+export const b = 2;
+export const c = 3;
`;
    const index = buildDiffIndex(NEW_FILE_DIFF);
    expect(index.byFile.get('src/new.ts')).toEqual([1, 2, 3]);
    expect(mapFinding(finding('src/new.ts', 1, 3), index)).toEqual({
      kind: 'inline',
      path: 'src/new.ts',
      line: 3,
      startLine: 1,
      side: 'RIGHT',
    });
  });

  it('handles a diff that both deletes one file and adds another', () => {
    const MIXED = `diff --git a/src/gone.ts b/src/gone.ts
deleted file mode 100644
index eee..0000000
--- a/src/gone.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-old one
-old two
diff --git a/src/keep.ts b/src/keep.ts
index 111..222 100644
--- a/src/keep.ts
+++ b/src/keep.ts
@@ -5,1 +5,2 @@
 kept
+added here
`;
    const index = buildDiffIndex(MIXED);
    expect(index.byFile.has('src/gone.ts')).toBe(false);
    // keep.ts: new line 5 (context 'kept'), 6 (added 'added here')
    expect(index.byFile.get('src/keep.ts')).toEqual([5, 6]);
    expect(mapFinding(finding('src/keep.ts', 6, 6), index)).toMatchObject({
      kind: 'inline',
      line: 6,
    });
  });
});

describe('helpers', () => {
  it('nearestCommentable returns null when the file is absent', () => {
    const index: DiffIndex = buildDiffIndex(FOO_DIFF);
    expect(nearestCommentable(index, 'src/absent.ts', 10)).toBeNull();
  });

  it('nearestCommentable returns the exact line at distance 0', () => {
    const index = buildDiffIndex(FOO_DIFF);
    expect(nearestCommentable(index, 'src/foo.ts', 12)).toBe(12);
  });
});
