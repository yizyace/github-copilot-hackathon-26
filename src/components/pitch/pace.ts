// The 4-minute pitch schedule from the timing slide ("Your 4 Minutes — Make
// Them Count"). One segment per content slide; the opening agenda slide has no
// segment. Times are seconds from the start of the pitch.

export interface Segment {
  id: string
  label: string
  startSec: number
  endSec: number
  /** Human window label, e.g. "0:20–2:00". */
  window: string
}

export const TOTAL_SEC = 240

export const SEGMENTS: Segment[] = [
  { id: 'problem', label: 'Problem', startSec: 0, endSec: 20, window: '0:00–0:20' },
  { id: 'demo', label: 'Live demo', startSec: 20, endSec: 120, window: '0:20–2:00' },
  { id: 'copilot', label: 'Copilot', startSec: 120, endSec: 165, window: '2:00–2:45' },
  { id: 'azure', label: 'Azure', startSec: 165, endSec: 210, window: '2:45–3:30' },
  { id: 'qa', label: 'Q&A', startSec: 210, endSec: 240, window: '3:30–4:00' },
]

export type Pace = 'ok' | 'warn' | 'over'

// MM:SS for a (possibly over-a-minute) second count.
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

// How elapsed time compares to the current segment's deadline: "warn" within
// the last `warnWithin` seconds, "over" once past the segment end or the total.
export function paceStatus(
  elapsedSec: number,
  targetEndSec: number,
  opts: { totalSec?: number; warnWithin?: number } = {},
): Pace {
  const { totalSec = TOTAL_SEC, warnWithin = 10 } = opts
  if (elapsedSec > targetEndSec || elapsedSec > totalSec) return 'over'
  if (targetEndSec - elapsedSec <= warnWithin) return 'warn'
  return 'ok'
}
