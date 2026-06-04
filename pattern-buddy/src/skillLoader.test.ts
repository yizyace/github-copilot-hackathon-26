import { describe, it, expect } from 'vitest';
import * as fs   from 'fs';
import * as os   from 'os';
import * as path from 'path';
import { parseSkill, loadSkills, selectEnabled, type Skill } from './skillLoader';

const VALID = [
  '---',
  'slug: coupling',
  'name: Coupling Issues',
  'category: coupling',
  'severity_ceiling: major',
  'enabled: true',
  '---',
  'Watch for tight coupling between modules.',
  '',
  'Prefer dependency injection.'
].join('\n');

describe('parseSkill', () => {
  it('parses all fields plus the markdown body from valid frontmatter', () => {
    const skill = parseSkill(VALID);
    expect(skill).not.toBeNull();
    expect(skill).toEqual<Skill>({
      slug:            'coupling',
      name:            'Coupling Issues',
      category:        'coupling',
      severityCeiling: 'major',
      enabled:         true,
      body:            'Watch for tight coupling between modules.\n\nPrefer dependency injection.',
    });
  });

  it('coerces enabled: false to a boolean false (not a truthy string)', () => {
    const raw = [
      '---',
      'slug: s',
      'name: S',
      'enabled: false',
      '---',
      'body'
    ].join('\n');
    const skill = parseSkill(raw);
    expect(skill?.enabled).toBe(false);
  });

  it('strips surrounding quotes from values', () => {
    const raw = [
      '---',
      'slug: "quoted"',
      "name: 'Quoted Name'",
      'category: "coupling"',
      '---',
      'body'
    ].join('\n');
    const skill = parseSkill(raw);
    expect(skill?.slug).toBe('quoted');
    expect(skill?.name).toBe('Quoted Name');
    expect(skill?.category).toBe('coupling');
  });

  it('maps severity_ceiling to severityCeiling', () => {
    const raw = [
      '---',
      'name: S',
      'severity_ceiling: minor',
      '---',
      'body'
    ].join('\n');
    expect(parseSkill(raw)?.severityCeiling).toBe('minor');
  });

  it('returns null when the frontmatter fences are missing', () => {
    expect(parseSkill('no frontmatter here, just a body')).toBeNull();
    expect(parseSkill('# Heading\n\nsome markdown')).toBeNull();
  });

  it('applies defaults when category, severity_ceiling and enabled are absent', () => {
    const raw = [
      '---',
      'name: Just A Name',
      '---',
      'body'
    ].join('\n');
    const skill = parseSkill(raw);
    expect(skill).toMatchObject({
      category:        'other',
      severityCeiling: 'major',
      enabled:         true,
    });
  });

  it('falls back to the provided slug for both slug and name when missing', () => {
    const raw = ['---', 'category: dry', '---', 'body'].join('\n');
    const skill = parseSkill(raw, 'fallback-slug');
    expect(skill?.slug).toBe('fallback-slug');
    expect(skill?.name).toBe('fallback-slug');
  });

  it('returns null when neither a name nor a fallback slug is available', () => {
    const raw = ['---', 'category: dry', '---', 'body'].join('\n');
    expect(parseSkill(raw)).toBeNull();
  });

  it('parses frontmatter delivered with CRLF line endings', () => {
    const skill = parseSkill(VALID.replace(/\n/g, '\r\n'));
    expect(skill).not.toBeNull();
    expect(skill?.slug).toBe('coupling');
    expect(skill?.name).toBe('Coupling Issues');
    expect(skill?.enabled).toBe(true);
    expect(skill?.body).toBe('Watch for tight coupling between modules.\n\nPrefer dependency injection.');
  });
});

describe('selectEnabled', () => {
  it('drops disabled skills', () => {
    const skills: Skill[] = [
      { slug: 'a', name: 'A', category: 'other', severityCeiling: 'major', enabled: true,  body: '' },
      { slug: 'b', name: 'B', category: 'other', severityCeiling: 'major', enabled: false, body: '' },
      { slug: 'c', name: 'C', category: 'other', severityCeiling: 'major', enabled: true,  body: '' },
    ];
    expect(selectEnabled(skills).map(s => s.slug)).toEqual(['a', 'c']);
  });
});

describe('loadSkills', () => {
  it('returns [] for a non-existent directory', () => {
    expect(loadSkills(path.join(os.tmpdir(), 'pb-skills-does-not-exist-xyz'))).toEqual([]);
  });

  it('parses .md files, uses the filename as the slug fallback, and skips malformed files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-skills-'));
    try {
      fs.writeFileSync(path.join(dir, 'coupling.md'), VALID, 'utf8');
      // No slug in frontmatter -> filename is the fallback slug.
      fs.writeFileSync(
        path.join(dir, 'dry.md'),
        ['---', 'name: DRY Violations', 'category: dry', '---', 'Avoid copy-paste.'].join('\n'),
        'utf8'
      );
      // Malformed (no fences) -> skipped.
      fs.writeFileSync(path.join(dir, 'broken.md'), 'no frontmatter at all', 'utf8');
      // Non-markdown -> ignored entirely.
      fs.writeFileSync(path.join(dir, 'README.txt'), 'ignore me', 'utf8');

      const skills = loadSkills(dir);
      // Sorted by filename: coupling, dry (broken is skipped, README.txt ignored).
      expect(skills.map(s => s.slug)).toEqual(['coupling', 'dry']);

      const dry = skills.find(s => s.slug === 'dry');
      expect(dry?.name).toBe('DRY Violations');
      expect(dry?.body).toBe('Avoid copy-paste.');
      // Defaults applied where keys were absent.
      expect(dry?.severityCeiling).toBe('major');
      expect(dry?.enabled).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
