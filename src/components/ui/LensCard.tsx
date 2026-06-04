import type { LensResult } from '../../lib/review/types'
import { Chip } from './Chip'
import './ui.css'

// A single lens's run: the memories it retrieved (top hit highlighted) beside
// its findings count — the harness's "why did it say that" view.
export function LensCard({ lens }: { lens: LensResult }) {
  const top = lens.retrieved.reduce((best, m) => (m.score > best ? m.score : best), -Infinity)
  return (
    <div className="sr-lens">
      <div className="sr-lens__head">
        <span className="sr-lens__title">{lens.title}</span>
        <span className="sr-lens__count">
          {lens.comments.length} finding{lens.comments.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="sr-lens__mem">
        {lens.retrieved.map((m) => (
          <li key={m.id} className={`sr-mem${m.score === top ? ' sr-mem--top' : ''}`}>
            <div className="sr-mem__top">
              <code className="sr-mem__id">{m.id}</code>
              <span className="sr-mem__score">{m.score.toFixed(2)}</span>
            </div>
            <span className="sr-mem__summary">{m.summary}</span>
            <Chip tone={m.source === 'human' ? 'ember' : 'spectral'}>{m.type}</Chip>
          </li>
        ))}
      </ul>
    </div>
  )
}
