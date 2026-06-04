interface SlideDotsProps {
  sections: { id: string; label: string }[]
  active: number
  onJump: (index: number) => void
}

// The deck's progress rail — also doubles as section navigation.
export function SlideDots({ sections, active, onJump }: SlideDotsProps) {
  return (
    <nav className="sr-dots" aria-label="Slides">
      {sections.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className={`sr-dot ${i === active ? 'is-active' : ''}`.trim()}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => onJump(i)}
        >
          <span className="sr-dot__mark" aria-hidden="true" />
          <span className="sr-dot__label">{s.label}</span>
        </button>
      ))}
    </nav>
  )
}
