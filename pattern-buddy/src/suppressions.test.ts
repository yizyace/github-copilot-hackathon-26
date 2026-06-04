import { describe, it, expect } from 'vitest';
import {
  Suppression,
  SUPPRESSED_HEADER,
  formatSuppression,
  parseSuppressions,
  isSuppressed,
  addSuppression,
} from './suppressions';

describe('sanitizes characters that would break the round-trip', () => {
  it('strips ** and backticks so an over-formatted name still round-trips and matches', () => {
    const written = formatSuppression({ patternName: '**Tight Coupling**', filePath: '`src/foo.ts`' });
    const parsed  = parseSuppressions(`${SUPPRESSED_HEADER}\n${written}`);
    expect(parsed).toEqual([{ patternName: 'Tight Coupling', filePath: 'src/foo.ts' }]);
    expect(isSuppressed({ patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 5 }, parsed)).toBe(true);
  });

  it('flattens newlines so a poisoned entry cannot truncate later suppressions', () => {
    let md = addSuppression('', { patternName: 'Foo\n## Injected', filePath: 'src/a.ts' });
    md = addSuppression(md, { patternName: 'Bar', filePath: 'src/b.ts' });
    const parsed = parseSuppressions(md);
    expect(parsed).toHaveLength(2);
    expect(parsed.map(p => p.patternName).sort()).toEqual(['Bar', 'Foo ## Injected']);
  });
});

describe('formatSuppression <-> parseSuppressions round-trip', () => {
  it('round-trips a suppression with a line', () => {
    const s: Suppression = { patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 };
    const md = `${SUPPRESSED_HEADER}\n${formatSuppression(s)}\n`;
    expect(parseSuppressions(md)).toEqual([s]);
  });

  it('round-trips a suppression without a line', () => {
    const s: Suppression = { patternName: 'God Object', filePath: 'src/bar.ts' };
    const md = `${SUPPRESSED_HEADER}\n${formatSuppression(s)}\n`;
    const parsed = parseSuppressions(md);
    expect(parsed).toEqual([s]);
    // No-line suppressions must NOT carry a lineStart key.
    expect('lineStart' in parsed[0]).toBe(false);
  });

  it('formats both shapes canonically', () => {
    expect(formatSuppression({ patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 }))
      .toBe('- **Tight Coupling** in `src/foo.ts` (line 12)');
    expect(formatSuppression({ patternName: 'Tight Coupling', filePath: 'src/foo.ts' }))
      .toBe('- **Tight Coupling** in `src/foo.ts`');
  });

  it('round-trips multiple bullets in order', () => {
    const items: Suppression[] = [
      { patternName: 'Tight Coupling', filePath: 'src/a.ts', lineStart: 4 },
      { patternName: 'Singleton Abuse', filePath: 'src/b.ts' },
    ];
    const md = `${SUPPRESSED_HEADER}\n${items.map(formatSuppression).join('\n')}\n`;
    expect(parseSuppressions(md)).toEqual(items);
  });
});

describe('parseSuppressions', () => {
  it('returns [] when there is no Suppressed section', () => {
    const md = '# Memory\n\n## Coupling Issues\n- **Tight Coupling** in `src/a.ts` (lines 4–6, PR #9): x\n';
    expect(parseSuppressions(md)).toEqual([]);
  });

  it('returns [] for empty input', () => {
    expect(parseSuppressions('')).toEqual([]);
  });

  it('ignores bullets in other sections and stops at the next heading', () => {
    const md = [
      '# Memory',
      '',
      '## Coupling Issues',
      '- **Tight Coupling** in `src/other.ts` (line 1)', // must be ignored — wrong section
      '',
      '## Suppressed',
      '- **Tight Coupling** in `src/foo.ts` (line 12)',
      '- **God Object** in `src/bar.ts`',
      '',
      '## Other',
      '- **Magic Number** in `src/after.ts` (line 3)', // must be ignored — after section
      '',
    ].join('\n');

    expect(parseSuppressions(md)).toEqual([
      { patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 },
      { patternName: 'God Object', filePath: 'src/bar.ts' },
    ]);
  });

  it('skips blank/prose/malformed lines within the section', () => {
    const md = [
      '## Suppressed',
      '',
      'some prose a maintainer typed',
      '- **Real One** in `src/x.ts` (line 7)',
      '- not a valid bullet',
      '',
    ].join('\n');
    expect(parseSuppressions(md)).toEqual([
      { patternName: 'Real One', filePath: 'src/x.ts', lineStart: 7 },
    ]);
  });

  it('tolerates CRLF line endings', () => {
    const md = ['## Suppressed', '- **Tight Coupling** in `src/foo.ts` (line 12)', ''].join('\r\n');
    expect(parseSuppressions(md)).toEqual([
      { patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 },
    ]);
  });
});

describe('isSuppressed', () => {
  const finding = { patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 };

  it('matches by pattern + file (no line on the suppression -> any line)', () => {
    const supps: Suppression[] = [{ patternName: 'Tight Coupling', filePath: 'src/foo.ts' }];
    expect(isSuppressed(finding, supps)).toBe(true);
    expect(isSuppressed({ ...finding, lineStart: 999 }, supps)).toBe(true);
  });

  it('matches by pattern + file + exact line', () => {
    const supps: Suppression[] = [{ patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 }];
    expect(isSuppressed(finding, supps)).toBe(true);
  });

  it('is case-insensitive (and trim-tolerant) on patternName', () => {
    const supps: Suppression[] = [{ patternName: '  tight coupling ', filePath: 'src/foo.ts' }];
    expect(isSuppressed(finding, supps)).toBe(true);
  });

  it('does NOT match a different file', () => {
    const supps: Suppression[] = [{ patternName: 'Tight Coupling', filePath: 'src/OTHER.ts' }];
    expect(isSuppressed(finding, supps)).toBe(false);
  });

  it('does NOT match a different line when the suppression specifies one', () => {
    const supps: Suppression[] = [{ patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 99 }];
    expect(isSuppressed(finding, supps)).toBe(false);
  });

  it('does NOT match a different pattern', () => {
    const supps: Suppression[] = [{ patternName: 'God Object', filePath: 'src/foo.ts' }];
    expect(isSuppressed(finding, supps)).toBe(false);
  });

  it('returns false against an empty suppression list', () => {
    expect(isSuppressed(finding, [])).toBe(false);
  });
});

describe('addSuppression', () => {
  it('creates the section at end of file when missing', () => {
    const md = '# Memory\n\n## Coupling Issues\n- existing\n';
    const out = addSuppression(md, { patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 });
    expect(out).toContain(`${SUPPRESSED_HEADER}\n- **Tight Coupling** in \`src/foo.ts\` (line 12)`);
    // Round-trips back out.
    expect(parseSuppressions(out)).toEqual([
      { patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 },
    ]);
    // Pre-existing content is untouched.
    expect(out).toContain('## Coupling Issues\n- existing');
  });

  it('creates the section for empty input', () => {
    const out = addSuppression('', { patternName: 'God Object', filePath: 'src/bar.ts' });
    expect(out).toBe('## Suppressed\n- **God Object** in `src/bar.ts`\n');
  });

  it('appends under an existing section, before the next heading', () => {
    const md = [
      '## Suppressed',
      '- **First** in `src/a.ts` (line 1)',
      '',
      '## Other',
      '- keep me',
      '',
    ].join('\n');
    const out = addSuppression(md, { patternName: 'Second', filePath: 'src/b.ts', lineStart: 2 });

    const parsed = parseSuppressions(out);
    expect(parsed).toEqual([
      { patternName: 'First', filePath: 'src/a.ts', lineStart: 1 },
      { patternName: 'Second', filePath: 'src/b.ts', lineStart: 2 },
    ]);
    // The new bullet lands before the next section, and Other is preserved.
    expect(out.indexOf('- **Second**')).toBeLessThan(out.indexOf('## Other'));
    expect(out).toContain('## Other\n- keep me');
  });

  it('de-dupes an identical entry (same file + pattern + line) -> unchanged', () => {
    const md = '## Suppressed\n- **Tight Coupling** in `src/foo.ts` (line 12)\n';
    const out = addSuppression(md, { patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 });
    expect(out).toBe(md);
  });

  it('de-dupes case-insensitively on pattern name', () => {
    const md = '## Suppressed\n- **Tight Coupling** in `src/foo.ts` (line 12)\n';
    const out = addSuppression(md, { patternName: 'tight coupling', filePath: 'src/foo.ts', lineStart: 12 });
    expect(out).toBe(md);
  });

  it('treats a no-line suppression as distinct from a same-pattern line suppression', () => {
    const md = '## Suppressed\n- **Tight Coupling** in `src/foo.ts` (line 12)\n';
    const out = addSuppression(md, { patternName: 'Tight Coupling', filePath: 'src/foo.ts' });
    expect(out).not.toBe(md);
    expect(parseSuppressions(out)).toEqual([
      { patternName: 'Tight Coupling', filePath: 'src/foo.ts', lineStart: 12 },
      { patternName: 'Tight Coupling', filePath: 'src/foo.ts' },
    ]);
  });
});
