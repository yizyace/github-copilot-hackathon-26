// The serializable result both entrypoints produce (the Action posts it; the
// harness renders it). A pragmatic subset of the design's ReviewResult, enough
// to render the demo faithfully.

export type Verdict = 'approve' | 'request_changes' | 'comment'
export type Severity = 'blocking' | 'non-blocking'

export interface RetrievedMemory {
  id: string
  type: string
  source: 'human' | 'agent'
  score: number
  summary: string
}

export interface ReviewComment {
  file: string
  line: number
  code?: string // the changed line the comment anchors to (for display)
  severity: Severity
  label: string // Conventional-Comments label, e.g. "suggestion"
  body: string
  citations?: string[] // journal entry ids this finding is grounded in
}

export interface LensResult {
  id: string
  title: string
  retrieved: RetrievedMemory[]
  comments: ReviewComment[]
}

export interface ReviewResult {
  persona: string
  avatar: string
  verdict: Verdict
  summary: string // top-level review body, in the agent's voice
  comments: ReviewComment[]
  lenses: LensResult[]
  meta: {
    model: string
    lensesRun: number
    durationMs: number
    diff: { file: string; additions: number; deletions: number }
  }
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  approve: 'Approved',
  request_changes: 'Changes requested',
  comment: 'Commented',
}
