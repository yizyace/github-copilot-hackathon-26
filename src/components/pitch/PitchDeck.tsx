import '../../styles/theme.css'
import '../landing/landing.css'
import '../ui/ui.css'
import './pitch.css'
import { Header } from '../landing/Header'
import { SlideDots } from '../landing/SlideDots'
import { useDeck } from '../landing/useDeck'
import { PaceTimer } from './PaceTimer'
import { SEGMENTS } from './pace'
import { AgendaSlide, AzureSlide, CloseSlide, CopilotSlide, DemoSlide, ProblemSlide } from './slides'

// The 4-minute pitch deck: a tight, timed companion to the marketing landing.
// Reuses the landing's scroll-snap deck (useDeck + SlideDots + Reveal) and adds
// a live presentation timer driven by the slide currently in view.
export function PitchDeck() {
  const { sectionRefs, active, jumpTo } = useDeck()

  const slides = [
    { id: 'agenda', label: 'Agenda', node: <AgendaSlide /> },
    { id: 'problem', label: 'Problem', node: <ProblemSlide /> },
    { id: 'demo', label: 'Live demo', node: <DemoSlide /> },
    { id: 'copilot', label: 'Copilot', node: <CopilotSlide /> },
    { id: 'azure', label: 'Azure', node: <AzureSlide /> },
    { id: 'qa', label: 'Q&A', node: <CloseSlide /> },
  ]

  // Slide 0 is the agenda (no segment); slides 1+ map onto the 4-min schedule.
  const segment = active > 0 ? (SEGMENTS[active - 1] ?? null) : null

  return (
    <div className="theme-soul sr-landing">
      <a className="sr-skip" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="sr-deck">
        {slides.map((s, i) => (
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
      <SlideDots sections={slides} active={active} onJump={jumpTo} />
      <PaceTimer segment={segment} />
    </div>
  )
}
