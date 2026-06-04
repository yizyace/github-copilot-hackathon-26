import { useCallback, useEffect, useRef, useState } from 'react'
import '../../styles/theme.css'
import './landing.css'
import { Header } from './Header'
import { SlideDots } from './SlideDots'
import { prefersReducedMotion } from './useInView'
import { Hero } from './sections/Hero'
import { Problem } from './sections/Problem'
import { SoulStack } from './sections/SoulStack'
import { HowItWorks } from './sections/HowItWorks'
import { Demo } from './sections/Demo'
import { Judging } from './sections/Judging'
import { Team } from './sections/Team'
import { Closing } from './sections/Closing'

const DEMO_INDEX = 4

export function Landing() {
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  const jumpTo = useCallback((index: number) => {
    const el = sectionRefs.current[index]
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [])

  const sections = [
    { id: 'hero', label: 'Intro', node: <Hero onSeeDemo={() => jumpTo(DEMO_INDEX)} /> },
    { id: 'problem', label: 'Problem', node: <Problem /> },
    { id: 'soul-stack', label: 'Soul Stack', node: <SoulStack /> },
    { id: 'how', label: 'Runtime', node: <HowItWorks /> },
    { id: 'demo', label: 'Demo', node: <Demo /> },
    { id: 'judging', label: 'Judging', node: <Judging /> },
    { id: 'team', label: 'Team', node: <Team /> },
    { id: 'closing', label: 'Start', node: <Closing /> },
  ]

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
      const last = sections.length - 1
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
  }, [active, jumpTo, sections.length])

  return (
    <div className="theme-soul sr-landing">
      <Header />
      <div className="sr-deck">
        {sections.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className="sr-section"
            aria-label={s.label}
            ref={(el) => {
              sectionRefs.current[i] = el
            }}
          >
            {s.node}
          </section>
        ))}
      </div>
      <SlideDots sections={sections} active={active} onJump={jumpTo} />
    </div>
  )
}
