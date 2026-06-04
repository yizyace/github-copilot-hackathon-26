import { useEffect, useState } from 'react'
import { formatTime, paceStatus, TOTAL_SEC, type Pace, type Segment } from './pace'

// A live presentation timer for the 4-minute pitch. It tracks elapsed time and
// compares it against the current slide's segment deadline: green while on pace,
// amber in the last 10s, red once you run over (or pass 4:00 overall).
export function PaceTimer({ segment }: { segment: Segment | null }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const targetEnd = segment ? segment.endSec : TOTAL_SEC
  const started = running || elapsed > 0
  const status: Pace | 'idle' = started ? paceStatus(elapsed, targetEnd) : 'idle'
  const stateLabel = !started
    ? 'ready'
    : status === 'over'
      ? 'over time'
      : status === 'warn'
        ? 'wrap up'
        : 'on pace'

  return (
    <section className={`sr-timer sr-timer--${status}`} aria-label="Presentation timer">
      <div className="sr-timer__top">
        <span className="sr-timer__clock">
          <span className="sr-timer__elapsed">{formatTime(elapsed)}</span>
          <span className="sr-timer__total"> / {formatTime(TOTAL_SEC)}</span>
        </span>
        <span className="sr-timer__state">{stateLabel}</span>
      </div>
      <div className="sr-timer__seg">
        {segment ? `${segment.label} · ${segment.window}` : 'Intro — start the clock when you begin'}
      </div>
      <div className="sr-timer__bar">
        <span
          className="sr-timer__fill"
          style={{ width: `${Math.min(100, (elapsed / TOTAL_SEC) * 100)}%` }}
        />
      </div>
      <div className="sr-timer__controls">
        <button
          type="button"
          className="sr-btn sr-btn--primary sr-timer__btn"
          onClick={() => setRunning((r) => !r)}
          aria-pressed={running}
        >
          {running ? '❚❚ Pause' : '▶ Start'}
        </button>
        <button
          type="button"
          className="sr-btn sr-btn--ghost sr-timer__btn"
          onClick={() => {
            setRunning(false)
            setElapsed(0)
          }}
        >
          ↺ Reset
        </button>
      </div>
    </section>
  )
}
