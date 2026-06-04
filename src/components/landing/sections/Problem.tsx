import { Reveal } from '../Reveal'

const LIMITS = [
  {
    n: '01',
    title: 'Flat & shallow',
    body: 'Everything competes for the same always-loaded budget. Add war stories, past decisions, and edge cases and the file bloats until the model skims it.',
  },
  {
    n: '02',
    title: 'Static',
    body: 'It only changes when a human edits it. The reviewer never accumulates judgment from the PRs it actually sees.',
  },
  {
    n: '03',
    title: 'Impersonal',
    body: 'It encodes rules, not a reviewer. No consistent voice, no sense that "this is how PatternBuddy reviews," no taste that sharpens over time.',
  },
]

export function Problem() {
  return (
    <div className="sr-section__inner">
      <Reveal>
        <p className="sr-eyebrow">The problem with a flat instructions file</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">
          <code>AGENTS.md</code> says the same thing to everyone — and never learns.
        </h2>
      </Reveal>
      <div className="sr-grid-3">
        {LIMITS.map((l, i) => (
          <Reveal key={l.n} delay={120 + i * 90}>
            <div className="sr-limit">
              <span className="sr-limit__n">{l.n}</span>
              <h3 className="sr-limit__title">{l.title}</h3>
              <p className="sr-limit__body">{l.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
