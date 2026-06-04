// The Soul Stack — the five-part personality a repo authors in its .soul/
// directory (see docs/design/soul-stack-format.md). These types model what the
// in-browser editor edits; serialize.ts turns them back into .soul/ files.

export type JournalType = 'decision' | 'reflection' | 'lesson' | 'interaction' | 'formative'
export type MemorySource = 'human' | 'agent'
export type Confidence = 'low' | 'med' | 'high'
export type Severity = 'blocking' | 'non-blocking'

export const JOURNAL_TYPES: JournalType[] = [
  'decision',
  'reflection',
  'lesson',
  'interaction',
  'formative',
]

// One append-only memory. The body follows a fixed three-heading skeleton so
// entries stay skimmable and quotable.
export interface JournalEntry {
  id: string
  type: JournalType
  title: string
  date: string // YYYY-MM-DD
  summary: string
  tags: string[]
  filesTouched?: string[]
  relatedPr?: string
  seeAlso?: string[]
  source?: MemorySource
  confidence?: Confidence
  context: string // ## Context — what happened
  insight: string // ## Insight — the payload
  application: string // ## Application — what to do differently
}

// One persona-flavored sub-reviewer; each runs as its own subagent.
export interface Lens {
  id: string
  title: string
  enabled: boolean
  rolePrompt: string
  rulesFocus?: string[]
  severityCeiling?: Severity
  weight?: number
}

// manifest.yaml — the wiring. The editor exposes the meaningful fields; export
// fills the remaining spec defaults (paths, limits, write-back guardrails).
export interface Manifest {
  version: number
  name: string
  persona: {
    displayName: string
    avatar: string
    tagline: string
  }
  models: {
    review: string
    embedding: string
  }
  lenses: Lens[]
  retrieval: {
    topK: number
    maxJournalContext: number
    fullBodyThreshold: number
    excludeLowConfidence: boolean
  }
  features: {
    writeBack: boolean
    seeAlsoExpansion: boolean
    failOnBlocking: boolean
  }
}

export interface SoulStack {
  manifest: Manifest
  soul: string // soul.md   — identity (markdown)
  ego: string // ego.md     — disposition (markdown, carries [[id]] pointers)
  rules: string // rules.md — policy (markdown)
  journal: JournalEntry[]
}
