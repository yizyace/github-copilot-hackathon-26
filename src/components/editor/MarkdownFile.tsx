import { countLines, countWords } from '../../lib/soulStack/validate'

interface Limit {
  words?: number
  lines: number
  ceilingLines?: number
}

// Editor for the three always-loaded markdown files, with live size meters
// against the spec's ceilings.
export function MarkdownFile({
  filename,
  value,
  onChange,
  limit,
  hint,
}: {
  filename: string
  value: string
  onChange: (v: string) => void
  limit: Limit
  hint?: string
}) {
  const words = countWords(value)
  const lines = countLines(value)
  const over = limit.ceilingLines
    ? lines > limit.ceilingLines
    : limit.words
      ? words > limit.words
      : lines > limit.lines
  const target = limit.words ? `${limit.words} words / ${limit.lines} lines` : `${limit.lines} lines`

  return (
    <div className="sr-ed-file">
      <div className="sr-ed-file__head">
        <h2 className="sr-ed-file__title">{filename}</h2>
        <span className={`sr-ed-count ${over ? 'is-over' : ''}`.trim()}>
          {words} words · {lines} lines{' '}
          <span className="sr-ed-count__target">(target {target})</span>
        </span>
      </div>
      {hint && <p className="sr-ed-hint">{hint}</p>}
      <textarea
        className="sr-input sr-input--code sr-ed-doc"
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        aria-label={filename}
      />
    </div>
  )
}
