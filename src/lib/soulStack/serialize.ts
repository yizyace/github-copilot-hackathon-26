// Turn the editor's Soul Stack back into the .soul/ files a repo commits.
// manifest.yaml and journal frontmatter are emitted with the `yaml` package; the
// editor's focused manifest model is expanded to the full schema here, filling
// the spec defaults (paths, limits, write-back) the forms don't expose.

import { stringify } from 'yaml'
import type { JournalEntry, Manifest, SoulStack } from './types'
import { journalFilename } from './validate'

export interface SoulFile {
  path: string
  content: string
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s : `${s}\n`
}

function manifestToYaml(m: Manifest): string {
  const doc = {
    version: m.version,
    name: m.name,
    persona: {
      display_name: m.persona.displayName,
      avatar: m.persona.avatar,
      tagline: m.persona.tagline,
    },
    models: { review: m.models.review, embedding: m.models.embedding },
    lenses: m.lenses.map((l) => {
      const lens: Record<string, unknown> = {
        id: l.id,
        title: l.title,
        enabled: l.enabled,
        role_prompt: l.rolePrompt,
      }
      if (l.rulesFocus?.length) lens.rules_focus = l.rulesFocus
      if (l.severityCeiling) lens.severity_ceiling = l.severityCeiling
      if (l.weight != null) lens.weight = l.weight
      return lens
    }),
    paths: {
      soul: '.soul/soul.md',
      ego: '.soul/ego.md',
      rules: '.soul/rules.md',
      journal_dir: '.soul/journal',
      db: '.soul/memory.db',
    },
    retrieval: {
      top_k: m.retrieval.topK,
      max_journal_context: m.retrieval.maxJournalContext,
      full_body_threshold: m.retrieval.fullBodyThreshold,
      filters: { tags_any: [], exclude_low_confidence: m.retrieval.excludeLowConfidence },
    },
    features: {
      write_back: m.features.writeBack,
      see_also_expansion: m.features.seeAlsoExpansion,
      fail_on_blocking: m.features.failOnBlocking,
    },
    limits: { max_files: 40, max_hunks_per_file: 30, max_diff_bytes: 200000 },
    writeback: {
      max_entries_per_run: 2,
      target_types: ['reflection', 'lesson'],
      require_label: 'soul:learn',
      human_review: true,
    },
  }
  return stringify(doc, { lineWidth: 0 })
}

function entryToMarkdown(e: JournalEntry): string {
  const fm: Record<string, unknown> = {
    id: e.id,
    type: e.type,
    title: e.title,
    date: e.date,
    summary: e.summary,
    tags: e.tags,
  }
  if (e.filesTouched?.length) fm.files_touched = e.filesTouched
  if (e.relatedPr) fm.related_pr = e.relatedPr
  if (e.seeAlso?.length) fm.see_also = e.seeAlso
  if (e.source) fm.source = e.source
  if (e.confidence) fm.confidence = e.confidence
  const frontmatter = stringify(fm, { lineWidth: 0 }).trimEnd()
  return (
    `---\n${frontmatter}\n---\n\n` +
    `## Context\n${e.context.trim()}\n\n` +
    `## Insight\n${e.insight.trim()}\n\n` +
    `## Application\n${e.application.trim()}\n`
  )
}

export function serializeSoulStack(stack: SoulStack): SoulFile[] {
  const files: SoulFile[] = [
    { path: '.soul/manifest.yaml', content: manifestToYaml(stack.manifest) },
    { path: '.soul/soul.md', content: ensureTrailingNewline(stack.soul) },
    { path: '.soul/ego.md', content: ensureTrailingNewline(stack.ego) },
    { path: '.soul/rules.md', content: ensureTrailingNewline(stack.rules) },
  ]
  for (const e of stack.journal)
    files.push({ path: `.soul/journal/${journalFilename(e)}`, content: entryToMarkdown(e) })
  return files
}
