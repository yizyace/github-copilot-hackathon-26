import { useCallback, useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './useInView'

// Scroll-snap deck navigation, shared by the marketing landing and the pitch
// deck. Tracks the section in view (to light up the matching dot) and wires
// deck-style keyboard nav. Attach the returned refs to each <section> in order.
export function useDeck() {
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  const jumpTo = useCallback((index: number) => {
    const el = sectionRefs.current[index]
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [])

  // Track the section in view to light up the matching dot.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = sectionRefs.current.indexOf(e.target as HTMLElement)
            if (idx >= 0) setActive(idx)
          }
        }
      },
      { threshold: 0.55 },
    )
    sectionRefs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Deck-style keyboard navigation (skips when typing in a form control).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return
      const last = sectionRefs.current.length - 1
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        jumpTo(Math.min(active + 1, last))
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        jumpTo(Math.max(active - 1, 0))
      } else if (e.key === 'Home') {
        e.preventDefault()
        jumpTo(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        jumpTo(last)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, jumpTo])

  return { sectionRefs, active, jumpTo }
}
