// Pure module for finding-suppressions stored in `.pattern-pointers.md`.
//
// PatternBuddy lets a teammate dismiss a finding with `@patternbuddy ignore
// <pattern@file:line>`. Each dismissal is recorded as a markdown bullet under a
// `## Suppressed` section so future reviews skip it. This module owns the
// parse/format/match/append logic and deliberately depends on nothing else
// (no other pattern-buddy file, no `@actions/*`) so it stays trivially testable.

export interface Suppression {
  readonly patternName: string;
  readonly filePath:    string;
  readonly lineStart?:  number;   // omitted = suppress this pattern anywhere in the file
}

export const SUPPRESSED_HEADER = '## Suppressed';

// Strip characters that would break the canonical bullet round-trip — the `**`
// bold delimiters and the `` ` `` code fence — and flatten newlines/runs of
// whitespace. A model that over-formats `pattern_name`/`file_path` (e.g. returns
// "**Tight Coupling**" or embeds a newline) must not be able to silently defeat
// the suppression or truncate later entries.
function clean(value: string): string {
  return value.replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
}

const normName = (s: string): string => clean(s).toLowerCase();
const normPath = (s: string): string => clean(s);

// Render one suppression as a markdown bullet (the canonical on-disk form):
//   - **Tight Coupling** in `src/foo.ts` (line 12)
//   - **Tight Coupling** in `src/foo.ts`            (no line)
export function formatSuppression(s: Suppression): string {
  const line = typeof s.lineStart === 'number' ? ` (line ${s.lineStart})` : '';
  return `- **${clean(s.patternName)}** in \`${clean(s.filePath)}\`${line}`;
}

// One bullet, e.g.  - **Tight Coupling** in `src/foo.ts` (line 12)
// Capture groups: 1=patternName, 2=filePath, 3=lineStart (optional).
const BULLET_RE = /^\s*-\s+\*\*(.+?)\*\*\s+in\s+`(.+?)`(?:\s+\(line\s+(\d+)\))?\s*$/;

// Split tolerant of CRLF / CR line endings, so files committed on either
// platform parse identically.
function splitLines(md: string): string[] {
  return md.split(/\r\n|\r|\n/);
}

// Parse the bullets under the `## Suppressed` section (until the next `## `
// heading or EOF) back into Suppression[]. Tolerates a missing section -> [].
// Round-trips with formatSuppression.
export function parseSuppressions(md: string): Suppression[] {
  const lines = splitLines(md);
  const out: Suppression[] = [];

  let inSection = false;
  for (const raw of lines) {
    const line = raw.trim();

    if (!inSection) {
      if (line === SUPPRESSED_HEADER) inSection = true;
      continue;
    }

    // Any new `## ` heading ends the Suppressed section.
    if (line.startsWith('## ')) break;

    const m = BULLET_RE.exec(raw);
    if (!m) continue; // skip blanks / prose / malformed lines

    const patternName = m[1].trim();
    const filePath    = m[2].trim();
    const suppression: Suppression = m[3] !== undefined
      ? { patternName, filePath, lineStart: Number(m[3]) }
      : { patternName, filePath };
    out.push(suppression);
  }

  return out;
}

// True when a finding should be dropped. Match rules:
//   - filePath: exact
//   - patternName: case-insensitive + trimmed
//   - lineStart: if the suppression carries one it must equal the finding's
//     lineStart; otherwise the suppression applies to any line in that file.
export function isSuppressed(
  finding: { patternName: string; filePath: string; lineStart: number },
  suppressions: readonly Suppression[],
): boolean {
  const fName = normName(finding.patternName);
  const fPath = normPath(finding.filePath);
  return suppressions.some(s => {
    if (normPath(s.filePath) !== fPath) return false;
    if (normName(s.patternName) !== fName) return false;
    if (typeof s.lineStart === 'number') return s.lineStart === finding.lineStart;
    return true;
  });
}

// Two suppressions are equivalent when they target the same file + pattern +
// line (an absent line is distinct from a specific line). Used to de-dupe on
// append and to back isSuppressed's "already recorded" check.
function sameSuppression(a: Suppression, b: Suppression): boolean {
  return normPath(a.filePath) === normPath(b.filePath)
    && normName(a.patternName) === normName(b.patternName)
    && a.lineStart === b.lineStart;
}

// Return md with the suppression appended under `## Suppressed`, creating the
// section at the end of the file if it is missing. De-dupes: if an equivalent
// suppression (same file + pattern + line) already exists, md is returned
// unchanged.
export function addSuppression(md: string, s: Suppression): string {
  if (parseSuppressions(md).some(existing => sameSuppression(existing, s))) {
    return md;
  }

  const bullet = formatSuppression(s);

  // Preserve the document's existing newline style when it's CRLF; default to
  // LF otherwise (including for empty input).
  const eol = /\r\n/.test(md) ? '\r\n' : '\n';
  const lines = splitLines(md);

  const headerIdx = lines.findIndex(l => l.trim() === SUPPRESSED_HEADER);

  if (headerIdx === -1) {
    // No section yet: create it at end of file. Guarantee a blank line before
    // the new heading so it doesn't fuse onto trailing content.
    const parts: string[] = [];
    if (md.length > 0) {
      parts.push(md.replace(/[\r\n]+$/, ''), '');
    }
    parts.push(SUPPRESSED_HEADER, bullet);
    return parts.join(eol) + eol;
  }

  // Insert the bullet after the last existing line of this section (before the
  // next `## ` heading or EOF), trimming a trailing blank so bullets stay
  // contiguous under the header.
  let insertAt = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('## ')) { insertAt = i; break; }
  }
  while (insertAt > headerIdx + 1 && lines[insertAt - 1].trim() === '') {
    insertAt--;
  }

  lines.splice(insertAt, 0, bullet);
  return lines.join(eol);
}
