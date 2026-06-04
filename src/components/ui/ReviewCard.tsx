import type { ReactNode } from 'react'
import { VERDICT_LABEL, type ReviewResult } from '../../lib/review/types'
import { SeverityBadge } from './SeverityBadge'
import { CitationChip } from './CitationChip'
import './ui.css'

// Render `code` spans in a markdown-ish string without pulling in a parser.
function withInlineCode(text: string): ReactNode[] {
  return text.split('`').map((part, i) =>
    i % 2 === 1 ? (
      <code key={i}>{part}</code>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

// The centerpiece: a single cohesive PR review in the persona's voice, with the
// memory citation visible. Reused on the landing hero/demo and in the editor.
export function ReviewCard({ result, className = '' }: { result: ReviewResult; className?: string }) {
  return (
    <article className={`sr-review ${className}`.trim()} aria-label={`Review by ${result.persona}`}>
      <header className="sr-review__head">
        <span className="sr-review__avatar" aria-hidden="true">
          {result.avatar}
        </span>
        <div className="sr-review__who">
          <span className="sr-review__name">{result.persona}</span>
          <span className="sr-review__meta">
            reviewed <code>{result.meta.diff.file}</code> · {result.meta.lensesRun} lenses
          </span>
        </div>
        <span className={`sr-verdict sr-verdict--${result.verdict}`}>{VERDICT_LABEL[result.verdict]}</span>
      </header>

      <p className="sr-review__summary">{withInlineCode(result.summary)}</p>

      {result.comments.map((c, i) => (
        <div className="sr-comment" key={`${c.file}:${c.line}:${i}`}>
          <div className="sr-comment__loc">
            <code className="sr-comment__file">
              {c.file}:{c.line}
            </code>
            <span className="sr-comment__tag">{c.label}</span>
            <SeverityBadge severity={c.severity} />
          </div>
          {c.code && (
            <pre className="sr-comment__code">
              <code>{c.code}</code>
            </pre>
          )}
          <p className="sr-comment__body">{withInlineCode(c.body)}</p>
          {c.citations && c.citations.length > 0 && (
            <div className="sr-comment__cites">
              {c.citations.map((id) => (
                <CitationChip key={id} id={id} />
              ))}
            </div>
          )}
        </div>
      ))}
    </article>
  )
}
