// Thin client for the two review-engine endpoints. Both fail soft: the live
// review falls back to the canned sampleReviewResult so the demo never breaks,
// and commitSoul surfaces a structured error instead of throwing.

import type { ReviewResult } from './review/types'
import { sampleReviewResult } from './review/sampleReviewResult'
import { serializeSoulStack } from './soulStack/serialize'
import type { SoulStack } from './soulStack/types'

export interface CommitResult {
  prUrl: string | null
  stub?: boolean
  error?: string
}

// POST the stack (and optional code) to /api/review. On any failure — network,
// non-2xx, or parse — return the pre-captured result so the UI always renders.
export async function runReview(stack: SoulStack, code?: string): Promise<ReviewResult> {
  try {
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stack, code }),
    })
    if (!res.ok) throw new Error(`review failed: ${res.status}`)
    return (await res.json()) as ReviewResult
  } catch {
    return sampleReviewResult
  }
}

// Serialize the stack to .soul/ files and POST them to /api/commit, which opens
// a PR. Returns the parsed body; on error returns a null PR with the message.
export async function commitSoul(stack: SoulStack, message?: string): Promise<CommitResult> {
  try {
    const files = serializeSoulStack(stack)
    const res = await fetch('/api/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, message }),
    })
    return (await res.json()) as CommitResult
  } catch (err) {
    return { prUrl: null, error: String(err) }
  }
}
