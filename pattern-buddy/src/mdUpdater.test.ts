import { describe, it, expect } from 'vitest';
import { appendToSection, entrySignature } from './mdUpdater';

const DOC = [
  '# Memory',
  '',
  '## Factory Patterns',
  '',
  '## Other',
  ''
].join('\n');

describe('appendToSection', () => {
  it('inserts under the target section, before the next header', () => {
    const out = appendToSection(DOC, '## Factory Patterns', '- a');
    expect(out).toContain('## Factory Patterns\n- a');
    // The entry must land before "## Other", not after it.
    expect(out.indexOf('- a')).toBeLessThan(out.indexOf('## Other'));
  });

  it('appends to the last section', () => {
    const out = appendToSection(DOC, '## Other', '- z');
    expect(out).toContain('## Other\n- z');
  });

  it('does NOT mis-insert into an earlier section when the target header has no trailing newline', () => {
    const doc = '## Factory Patterns\n- existing\n## Other'; // note: no trailing newline
    const out = appendToSection(doc, '## Other', '- new');
    expect(out).toBe('## Factory Patterns\n- existing\n## Other\n- new\n');
    // Regression guard: the entry must come AFTER the Other header.
    expect(out.indexOf('- new')).toBeGreaterThan(out.indexOf('## Other'));
  });

  it('creates the section when it is missing', () => {
    const out = appendToSection('# Memory\n', '## Coupling Issues', '- c');
    expect(out).toContain('## Coupling Issues\n- c');
  });
});

describe('entrySignature', () => {
  it('keys on patternName + filePath + lineStart with an en-dash anchor', () => {
    const sig = entrySignature({
      category: 'coupling-issues', entry: 'x',
      patternName: 'Tight Coupling', filePath: 'src/a.ts', lineStart: 4
    });
    expect(sig).toBe('**Tight Coupling** in `src/a.ts` (lines 4–');
    // Matches the real entry for line 4...
    expect('- **Tight Coupling** in `src/a.ts` (lines 4–6, PR #9): x'.includes(sig)).toBe(true);
    // ...but the trailing en-dash stops "4" from matching "42".
    expect('- **Tight Coupling** in `src/a.ts` (lines 42–48, PR #9): x'.includes(sig)).toBe(false);
  });
});
