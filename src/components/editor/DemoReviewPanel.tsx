import { useEffect, useRef, useState } from 'react'
import { sampleReviewResult } from '../../lib/review/sampleReviewResult'
import type { ReviewResult } from '../../lib/review/types'
import { ReviewCard } from '../ui/ReviewCard'
import { LensCard } from '../ui/LensCard'
import { prefersReducedMotion } from '../landing/useInView'

const PHASES = ['Loading soul stack', 'Retrieving memories', 'Running lenses', 'Synthesizing', 'Done']

interface DemoReviewPanelProps {
  onClose: () => void
  result?: ReviewResult
  loading?: boolean
}

// A run of the review engine: animate the phases, then render a ReviewResult.
// When a live `result` is passed it renders that; otherwise it falls back to the
// pre-captured sampleReviewResult (no engine, no keys). The panels are pure
// functions of ReviewResult, exactly as the real harness renders them. Uses a
// native <dialog> so focus trap, Escape, and focus return are handled by the
// platform.
export function DemoReviewPanel({ onClose, result, loading }: DemoReviewPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [phase, setPhase] = useState(() => (prefersReducedMotion() ? PHASES.length - 1 : 0))

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    const handleClose = () => onClose()
    d.addEventListener('close', handleClose)
    return () => d.removeEventListener('close', handleClose)
  }, [onClose])

  useEffect(() => {
    if (phase >= PHASES.length - 1) return
    const t = setTimeout(() => setPhase((p) => p + 1), 700)
    return () => clearTimeout(t)
  }, [phase])

  // The result to render: the live one if given, else the canned fallback.
  const shown = result ?? sampleReviewResult
  // Hold on the animation while the live call is in flight; reveal once the
  // phases finish and we're no longer loading.
  const done = phase >= PHASES.length - 1 && !loading
  const close = () => dialogRef.current?.close()

  return (
    <dialog ref={dialogRef} className="sr-modal" aria-labelledby="sr-demo-title">
      <div className="sr-modal__head">
        <h2 id="sr-demo-title" className="sr-modal__title">
          Demo review
        </h2>
        <button type="button" className="sr-modal__close" onClick={close} aria-label="Close demo review">
          ×
        </button>
      </div>

      <ol className="sr-phases" aria-live="polite">
        {PHASES.map((p, i) => (
          <li key={p} className={`sr-phase ${i < phase ? 'is-done' : ''} ${i === phase ? 'is-active' : ''}`.trim()}>
            {p}
          </li>
        ))}
      </ol>

      {done && (
        <div className="sr-modal__result">
          <ReviewCard result={shown} />
          <div className="sr-modal__lenses">
            {shown.lenses.map((l) => (
              <LensCard key={l.id} lens={l} />
            ))}
          </div>
          <p className="sr-modal__note">
            {result
              ? 'Live result — the engine runs this same review in CI (the Action) and in the local harness.'
              : 'Pre-captured result — the engine runs this same review in CI (the Action) and in the local harness.'}
          </p>
        </div>
      )}
    </dialog>
  )
}
