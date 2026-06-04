import { useEffect, useState } from 'react'
import { sampleReviewResult } from '../../lib/review/sampleReviewResult'
import { ReviewCard } from '../ui/ReviewCard'
import { LensCard } from '../ui/LensCard'
import { prefersReducedMotion } from '../landing/useInView'

const PHASES = ['Loading soul stack', 'Retrieving memories', 'Running lenses', 'Synthesizing', 'Done']

// A canned run of the review engine: animate the phases, then render the
// pre-captured ReviewResult. No engine, no keys — the panels are pure
// functions of ReviewResult, exactly as the real harness renders them.
export function DemoReviewPanel({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(() => (prefersReducedMotion() ? PHASES.length - 1 : 0))

  useEffect(() => {
    if (phase >= PHASES.length - 1) return
    const t = setTimeout(() => setPhase((p) => p + 1), 700)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const done = phase >= PHASES.length - 1

  return (
    <div className="sr-modal" role="dialog" aria-modal="true" aria-label="Demo review" onClick={onClose}>
      <div className="sr-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sr-modal__head">
          <h2 className="sr-modal__title">Demo review</h2>
          <button type="button" className="sr-modal__close" onClick={onClose} aria-label="Close demo review">
            ×
          </button>
        </div>

        <ol className="sr-phases">
          {PHASES.map((p, i) => (
            <li key={p} className={`sr-phase ${i < phase ? 'is-done' : ''} ${i === phase ? 'is-active' : ''}`.trim()}>
              {p}
            </li>
          ))}
        </ol>

        {done && (
          <div className="sr-modal__result">
            <ReviewCard result={sampleReviewResult} />
            <div className="sr-modal__lenses">
              {sampleReviewResult.lenses.map((l) => (
                <LensCard key={l.id} lens={l} />
              ))}
            </div>
            <p className="sr-modal__note">
              Pre-captured result — the engine runs this same review in CI (the Action) and in the
              local harness.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
