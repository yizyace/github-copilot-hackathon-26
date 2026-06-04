// Pure validation for a Soul Stack — the in-browser equivalent of the design's
// future `soul-review lint`. No I/O; safe to unit-test and run on every keystroke.

import { JOURNAL_TYPES, type JournalEntry, type SoulStack } from './types'

export type IssueLevel = 'error' | 'warning'

export interface ValidationIssue {
  level: IssueLevel
  file: string
  field?: string
  message: string
}

// Size targets / hard ceilings from soul-stack-format.md §1.
export const SIZE_LIMITS = {
  soul: { words: 400, lines: 40, ceilingLines: 60 },
  ego: { words: 800, lines: 80, ceilingLines: 120 },
  rules: { lines: 120 },
  journalBodyWords: 250,
} as const

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export function countLines(text: string): number {
  const trimmed = text.replace(/\s+$/, '')
  return trimmed ? trimmed.split(/\r?\n/).length : 0
}

// Hard pointers — every [[journal-id]] token in soul.md / ego.md.
export function extractPointers(markdown: string): string[] {
  const ids: string[] = []
  const re = /\[\[([a-z0-9-]+)\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) ids.push(m[1])
  return ids
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
// Convention: <type>-<YYYY-MM-DD>-<slug> (id is canonical; filename derives from it).
const ID_CONVENTION = /^[a-z]+-\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/

// journal/<YYYY-MM-DD>-<type>-<kebab-slug>.md
export function journalFilename(entry: JournalEntry): string {
  const slug = entry.id.replace(new RegExp(`^${entry.type}-\\d{4}-\\d{2}-\\d{2}-`), '')
  return `${entry.date}-${entry.type}-${slug || 'entry'}.md`
}

function validateMarkdownSizes(stack: SoulStack, issues: ValidationIssue[]): void {
  const soulWords = countWords(stack.soul)
  const soulLines = countLines(stack.soul)
  if (soulLines > SIZE_LIMITS.soul.ceilingLines)
    issues.push({
      level: 'error',
      file: 'soul.md',
      message: `Over the hard ceiling: ${soulLines} lines (max ${SIZE_LIMITS.soul.ceilingLines}). soul.md must stay short — move depth to the journal.`,
    })
  else if (soulWords > SIZE_LIMITS.soul.words || soulLines > SIZE_LIMITS.soul.lines)
    issues.push({
      level: 'warning',
      file: 'soul.md',
      message: `Over target (${soulWords}/${SIZE_LIMITS.soul.words} words, ${soulLines}/${SIZE_LIMITS.soul.lines} lines). Keep identity tight.`,
    })

  const egoWords = countWords(stack.ego)
  const egoLines = countLines(stack.ego)
  if (egoLines > SIZE_LIMITS.ego.ceilingLines)
    issues.push({
      level: 'error',
      file: 'ego.md',
      message: `Over the hard ceiling: ${egoLines} lines (max ${SIZE_LIMITS.ego.ceilingLines}). ego.md is an index over the journal, not an archive.`,
    })
  else if (egoWords > SIZE_LIMITS.ego.words || egoLines > SIZE_LIMITS.ego.lines)
    issues.push({
      level: 'warning',
      file: 'ego.md',
      message: `Over target (${egoWords}/${SIZE_LIMITS.ego.words} words, ${egoLines}/${SIZE_LIMITS.ego.lines} lines).`,
    })

  const rulesLines = countLines(stack.rules)
  if (rulesLines > SIZE_LIMITS.rules.lines)
    issues.push({
      level: 'warning',
      file: 'rules.md',
      message: `Over target (${rulesLines}/${SIZE_LIMITS.rules.lines} lines). rules.md is a checklist — keep it terse.`,
    })
}

function validateJournal(stack: SoulStack, issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>()
  const seen = new Set<string>()
  for (const entry of stack.journal) {
    const file = `journal/${journalFilename(entry)}`
    if (!entry.id) {
      issues.push({ level: 'error', file, field: 'id', message: 'Missing required `id`.' })
    } else {
      if (seen.has(entry.id))
        issues.push({ level: 'error', file, field: 'id', message: `Duplicate id "${entry.id}".` })
      seen.add(entry.id)
      ids.add(entry.id)
      if (!ID_CONVENTION.test(entry.id))
        issues.push({
          level: 'warning',
          file,
          field: 'id',
          message: `id "${entry.id}" doesn't match <type>-<YYYY-MM-DD>-<slug>.`,
        })
    }
    if (!entry.title)
      issues.push({ level: 'error', file, field: 'title', message: 'Missing required `title`.' })
    if (!entry.summary)
      issues.push({
        level: 'error',
        file,
        field: 'summary',
        message: 'Missing required `summary` (it is the text embedded for retrieval).',
      })
    if (!entry.tags || entry.tags.length === 0)
      issues.push({ level: 'warning', file, field: 'tags', message: 'No `tags` — retrieval and ego.md themes rely on them.' })
    if (!JOURNAL_TYPES.includes(entry.type))
      issues.push({ level: 'error', file, field: 'type', message: `Invalid type "${entry.type}".` })
    if (!ISO_DATE.test(entry.date))
      issues.push({ level: 'error', file, field: 'date', message: `Date "${entry.date}" is not YYYY-MM-DD.` })

    const bodyWords = countWords(`${entry.context} ${entry.insight} ${entry.application}`)
    if (bodyWords > SIZE_LIMITS.journalBodyWords)
      issues.push({
        level: 'warning',
        file,
        message: `Body is ${bodyWords} words (target ≤ ${SIZE_LIMITS.journalBodyWords}).`,
      })
  }
  return ids
}

function validatePointers(stack: SoulStack, ids: Set<string>, issues: ValidationIssue[]): void {
  for (const [file, md] of [
    ['soul.md', stack.soul],
    ['ego.md', stack.ego],
  ] as const) {
    for (const id of extractPointers(md))
      if (!ids.has(id))
        issues.push({
          level: 'warning',
          file,
          message: `Pointer [[${id}]] doesn't resolve to any journal entry.`,
        })
  }
  for (const entry of stack.journal)
    for (const ref of entry.seeAlso ?? [])
      if (!ids.has(ref))
        issues.push({
          level: 'warning',
          file: `journal/${journalFilename(entry)}`,
          field: 'see_also',
          message: `see_also "${ref}" doesn't resolve to any journal entry.`,
        })
}

function validateManifest(stack: SoulStack, issues: ValidationIssue[]): void {
  const m = stack.manifest
  const file = 'manifest.yaml'
  if (!m.name.trim()) issues.push({ level: 'error', file, field: 'name', message: 'Missing `name`.' })
  if (!m.persona.displayName.trim())
    issues.push({ level: 'error', file, field: 'persona.display_name', message: 'Missing persona display name.' })
  if (!m.models.review.trim())
    issues.push({ level: 'error', file, field: 'models.review', message: 'Missing review model.' })
  if (!m.models.embedding.trim())
    issues.push({ level: 'warning', file, field: 'models.embedding', message: 'No embedding model — retrieval falls back to lexical (FTS).' })

  const lensIds = new Set<string>()
  for (const lens of m.lenses) {
    if (lensIds.has(lens.id))
      issues.push({ level: 'error', file, field: `lenses.${lens.id}`, message: `Duplicate lens id "${lens.id}".` })
    lensIds.add(lens.id)
  }
  if (!m.lenses.some((l) => l.enabled))
    issues.push({ level: 'error', file, field: 'lenses', message: 'No lens is enabled — the reviewer has nothing to run.' })
}

// The whole stack → a flat, ordered list of errors and warnings.
export function validateSoulStack(stack: SoulStack): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  validateManifest(stack, issues)
  validateMarkdownSizes(stack, issues)
  const ids = validateJournal(stack, issues)
  validatePointers(stack, ids, issues)
  return issues
}

export function countIssues(issues: ValidationIssue[]): { errors: number; warnings: number } {
  return {
    errors: issues.filter((i) => i.level === 'error').length,
    warnings: issues.filter((i) => i.level === 'warning').length,
  }
}
