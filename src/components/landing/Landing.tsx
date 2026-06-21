import '../../styles/theme.css'
import './landing.css'
import { Header } from './Header'
import { SlideDots } from './SlideDots'
import { useDeck } from './useDeck'
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
  const { sectionRefs, active, jumpTo } = useDeck()

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

  return (
    <div className="theme-soul sr-landing">
      <a className="sr-skip" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="sr-deck">
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
      </main>
      <SlideDots sections={sections} active={active} onJump={jumpTo} />
    </div>
  )
}
