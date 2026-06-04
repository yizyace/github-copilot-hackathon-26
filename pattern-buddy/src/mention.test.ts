import { describe, it, expect } from 'vitest';
import {
  stripTrigger,
  setSkillEnabled,
  buildSkillFile,
  parseApplyChange,
  buildMentionPrompt,
  safeSlug,
} from './mention';
import { parseSkill } from './skillLoader';

describe('safeSlug', () => {
  it('accepts lowercase kebab-case slugs', () => {
    expect(safeSlug('factory-singleton')).toBe('factory-singleton');
    expect(safeSlug('coupling')).toBe('coupling');
    expect(safeSlug('a1-b2')).toBe('a1-b2');
  });

  it('rejects path traversal and other unsafe slugs', () => {
    expect(() => safeSlug('../../.github/workflows/pattern-buddy-mention')).toThrow();
    expect(() => safeSlug('foo/bar')).toThrow();
    expect(() => safeSlug('UPPER')).toThrow();
    expect(() => safeSlug('-leading-hyphen')).toThrow();
    expect(() => safeSlug('')).toThrow();
    expect(() => safeSlug('a'.repeat(65))).toThrow();
  });
});

describe('parseApplyChange suppress_finding', () => {
  it('parses a suppress_finding with pattern, file, and line', () => {
    const c = parseApplyChange('{"action":"suppress_finding","pattern_name":"Tight Coupling","file_path":"src/foo.ts","line":12,"human_summary":"ok"}');
    expect(c?.action).toBe('suppress_finding');
    expect(c?.pattern_name).toBe('Tight Coupling');
    expect(c?.file_path).toBe('src/foo.ts');
    expect(c?.line).toBe(12);
  });
});

describe('stripTrigger', () => {
  it('removes the trigger and collapses whitespace', () => {
    expect(stripTrigger('@patternbuddy be stricter')).toBe('be stricter');
  });

  it('handles the trigger mid-sentence and trims', () => {
    expect(stripTrigger('hey @patternbuddy   switch to roast  ')).toBe('hey switch to roast');
  });

  it('removes multiple occurrences', () => {
    expect(stripTrigger('@patternbuddy and also @patternbuddy stop')).toBe('and also stop');
  });

  it('returns empty string when only the trigger is present', () => {
    expect(stripTrigger('@patternbuddy')).toBe('');
    expect(stripTrigger('   @patternbuddy   ')).toBe('');
  });

  it('honors a custom trigger token', () => {
    expect(stripTrigger('@bot focus on coupling', '@bot')).toBe('focus on coupling');
  });
});

describe('setSkillEnabled', () => {
  const FILE = [
    '---',
    'slug: factory-singleton',
    'name: Factory & Singleton Misuse',
    'category: factory_singleton',
    'severity_ceiling: major',
    'enabled: true',
    '---',
    '',
    '## What to look for',
    'body text',
    '',
  ].join('\n');

  it('flips enabled: true to false', () => {
    const out = setSkillEnabled(FILE, false);
    expect(out).toContain('enabled: false');
    expect(out).not.toContain('enabled: true');
    // The body is untouched.
    expect(out).toContain('## What to look for');
    expect(out).toContain('body text');
  });

  it('flips enabled: false to true', () => {
    const disabled = FILE.replace('enabled: true', 'enabled: false');
    const out = setSkillEnabled(disabled, true);
    expect(out).toContain('enabled: true');
    expect(out).not.toContain('enabled: false');
  });

  it('is idempotent (setting true when already true)', () => {
    expect(setSkillEnabled(FILE, true)).toBe(FILE);
  });

  it('tolerates surrounding spaces and mixed case in the value', () => {
    const messy = FILE.replace('enabled: true', 'enabled:   TRUE  ');
    const out = setSkillEnabled(messy, false);
    expect(out).toContain('enabled: false');
    expect(out).not.toMatch(/enabled:\s*TRUE/);
  });

  it('preserves CRLF line endings', () => {
    const crlf = FILE.replace(/\n/g, '\r\n');
    const out = setSkillEnabled(crlf, false);
    expect(out).toContain('enabled: false\r\n');
    // Other CRLF lines remain intact (no stray lone \n introduced on the body).
    expect(out).toContain('---\r\n');
    expect(out).not.toMatch(/enabled: false(?!\r)/);
  });

  it('round-trips through the skill parser (true -> false -> parsed.enabled === false)', () => {
    const out = setSkillEnabled(FILE, false);
    const skill = parseSkill(out);
    expect(skill?.enabled).toBe(false);
    expect(skill?.slug).toBe('factory-singleton');
  });

  it('inserts an enabled: line when the frontmatter lacks one', () => {
    const noEnabled = [
      '---',
      'slug: s',
      'name: S',
      '---',
      'body',
    ].join('\n');
    const out = setSkillEnabled(noEnabled, false);
    expect(parseSkill(out)?.enabled).toBe(false);
    // The inserted line lives inside the frontmatter, not the body.
    expect(out.indexOf('enabled: false')).toBeLessThan(out.lastIndexOf('---'));
  });
});

describe('buildSkillFile', () => {
  it('produces frontmatter (enabled:true, severity major) plus a trimmed body', () => {
    const out = buildSkillFile({
      slug: 'no-god-objects',
      name: 'No God Objects',
      category: 'coupling',
      body: '\n## Rule\nDo not.\n\n',
    });
    expect(out).toContain('slug: no-god-objects');
    expect(out).toContain('name: No God Objects');
    expect(out).toContain('category: coupling');
    expect(out).toContain('severity_ceiling: major');
    expect(out).toContain('enabled: true');
    expect(out).toContain('## Rule\nDo not.');
  });

  it('round-trips through parseSkill with all fields intact', () => {
    const out = buildSkillFile({
      slug: 'no-god-objects',
      name: 'No God Objects',
      category: 'coupling',
      body: 'Keep classes small.',
    });
    const skill = parseSkill(out);
    expect(skill).toMatchObject({
      slug: 'no-god-objects',
      name: 'No God Objects',
      category: 'coupling',
      severityCeiling: 'major',
      enabled: true,
      body: 'Keep classes small.',
    });
  });

  it('falls back to category "other" for an unknown category', () => {
    const out = buildSkillFile({ slug: 's', name: 'S', category: 'bogus', body: 'x' });
    expect(out).toContain('category: other');
  });
});

describe('parseApplyChange', () => {
  it('parses a valid set_strictness object', () => {
    const change = parseApplyChange('{"action":"set_strictness","strictness":"strict","human_summary":"Now strict."}');
    expect(change).toEqual({
      action: 'set_strictness',
      strictness: 'strict',
      human_summary: 'Now strict.',
    });
  });

  it('parses JSON wrapped in a ```json fence', () => {
    const raw = '```json\n{"action":"none","human_summary":"No change."}\n```';
    expect(parseApplyChange(raw)?.action).toBe('none');
  });

  it('parses JSON with surrounding prose', () => {
    const raw = 'Sure! Here you go: {"action":"set_tone","tone":"roast","human_summary":"Roast mode."} Done.';
    const change = parseApplyChange(raw);
    expect(change?.action).toBe('set_tone');
    expect(change?.tone).toBe('roast');
  });

  it('keeps optional skill fields for create_skill', () => {
    const change = parseApplyChange(JSON.stringify({
      action: 'create_skill',
      skill_slug: 'x',
      skill_name: 'X',
      skill_category: 'dry',
      rule_markdown: '## R',
      human_summary: 'Created.',
    }));
    expect(change).toMatchObject({
      action: 'create_skill',
      skill_slug: 'x',
      skill_name: 'X',
      skill_category: 'dry',
      rule_markdown: '## R',
    });
  });

  it('returns null for unparseable input', () => {
    expect(parseApplyChange('not json at all')).toBeNull();
  });

  it('returns null when action is not in the enum', () => {
    expect(parseApplyChange('{"action":"delete_everything","human_summary":"oops"}')).toBeNull();
  });

  it('returns null when human_summary is missing', () => {
    expect(parseApplyChange('{"action":"none"}')).toBeNull();
  });

  it('returns null when human_summary is not a string', () => {
    expect(parseApplyChange('{"action":"none","human_summary":42}')).toBeNull();
  });

  it('drops non-string optional fields rather than including them', () => {
    const change = parseApplyChange('{"action":"set_tone","tone":123,"human_summary":"ok"}');
    expect(change?.action).toBe('set_tone');
    expect(change?.tone).toBeUndefined();
  });
});

describe('buildMentionPrompt', () => {
  it('embeds the instruction and the known skill slugs and valid values', () => {
    const prompt = buildMentionPrompt('stop flagging factory patterns');
    expect(prompt).toContain('stop flagging factory patterns');
    expect(prompt).toContain('factory-singleton');
    expect(prompt).toContain('coupling');
    // Valid tone/strictness vocab is present so Claude can map free text.
    expect(prompt).toContain('roast');
    expect(prompt).toContain('strict');
    // Asks for JSON only.
    expect(prompt.toLowerCase()).toContain('only a single json object');
  });
});
