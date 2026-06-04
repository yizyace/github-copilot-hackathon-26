import './ui.css'

// The "wow": a finding grounded in a retrieved memory. Spectral = memory.
export function CitationChip({ id }: { id: string }) {
  return (
    <span className="sr-cite" title={`Grounded in memory: ${id}`}>
      <span className="sr-cite__glyph" aria-hidden="true">
        ◆
      </span>
      <span className="sr-cite__label">
        per <code>{id}</code>
      </span>
    </span>
  )
}
