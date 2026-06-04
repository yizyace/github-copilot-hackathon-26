/**
 * Skill playbook loading, parsing & selection.
 *
 * Skills are team-editable markdown playbooks: a small `---`-delimited YAML
 * frontmatter block (`slug, name, category, severity_ceiling, enabled`) plus a
 * markdown body. PatternBuddy loads the enabled ones and injects their bodies
 * into the Claude prompt.
 *
 * We parse the small, flat frontmatter ourselves to keep the package free of a
 * YAML dependency — the frontmatter is intentionally simple `key: value` lines.
 *
 * This module is deliberately decoupled: it may use `fs`/`path`, but it does NOT
 * depend on `./types` or `@actions/*`, so it can be unit-tested and reused in
 * isolation.
 */
import * as fs   from 'fs';
import * as path from 'path';

export interface Skill {
  readonly slug:            string;
  readonly name:            string;
  readonly category:        string;
  readonly severityCeiling: string;
  readonly enabled:         boolean;
  readonly body:            string;
}

/**
 * Parse a single skill markdown document into a {@link Skill}.
 *
 * Splits the leading `---` frontmatter block from the markdown body, then parses
 * each `key: value` line (optional surrounding quotes are stripped). `enabled` is
 * coerced to a boolean (`=== 'true'`), and `severity_ceiling` is mapped to
 * `severityCeiling`. Sensible defaults are applied when keys are absent:
 * `category: 'other'`, `severityCeiling: 'major'`, `enabled: true`.
 *
 * Requires at least a `name` (falling back to the slug). Returns `null` when the
 * frontmatter is malformed (no `---` fences) or no name/slug can be determined.
 *
 * @param raw          The full file contents.
 * @param fallbackSlug A slug to use when the frontmatter omits one (typically the
 *                     filename without its `.md` extension).
 */
export function parseSkill(raw: string, fallbackSlug?: string): Skill | null {
  // Strip BOM and normalize CRLF/CR so the `\n`-based fence regex and the
  // line-by-line frontmatter parse work regardless of the file's line endings
  // (Windows runners / .gitattributes can deliver CRLF).
  const normalized = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(normalized);
  if (!match) {
    // Malformed: no `---` frontmatter fences.
    return null;
  }

  const fm   = match[1] ?? '';
  const body = (match[2] ?? '').trim();

  const fields: Record<string, string> = {};
  for (const line of fm.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key   = trimmed.slice(0, idx).trim();
    let   value = trimmed.slice(idx + 1).trim();
    // Strip optional surrounding quotes.
    value = value.replace(/^["']/, '').replace(/["']$/, '');
    fields[key] = value;
  }

  const slug = fields.slug ?? fallbackSlug;
  const name = fields.name ?? slug;
  // Require at least a name (or a slug we can fall back to as the name).
  if (!name) return null;

  return {
    slug:            slug ?? name,
    name,
    category:        fields.category ?? 'other',
    severityCeiling: fields.severity_ceiling ?? 'major',
    enabled:         'enabled' in fields ? fields.enabled === 'true' : true,
    body,
  };
}

/**
 * Load every `*.md` skill playbook from `dir`.
 *
 * Returns `[]` when `dir` does not exist. Each file is parsed via
 * {@link parseSkill} (with the slug defaulting to the filename without `.md`);
 * files whose frontmatter is malformed are skipped with a `console.warn`. Results
 * are sorted by filename for deterministic prompts.
 */
export function loadSkills(dir: string): Skill[] {
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort();

  const skills: Skill[] = [];
  for (const file of files) {
    const raw         = fs.readFileSync(path.join(dir, file), 'utf8');
    const fallbackSlug = file.replace(/\.md$/, '');
    const skill       = parseSkill(raw, fallbackSlug);
    if (skill === null) {
      console.warn(`skillLoader: skipping malformed skill file "${file}"`);
      continue;
    }
    skills.push(skill);
  }
  return skills;
}

/** Select only the enabled skills. */
export function selectEnabled(skills: Skill[]): Skill[] {
  return skills.filter(s => s.enabled);
}
