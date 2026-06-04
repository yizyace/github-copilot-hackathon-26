import { Link } from 'react-router-dom'
import { Reveal } from '../landing/Reveal'
import { siteConfig } from '../../config'

// A small per-slide time badge. `focus` marks the slide you should linger on.
function SlideTime({ time, focus = false }: { time: string; focus?: boolean }) {
  return (
    <div className="sr-slidetime">
      <span className={`sr-chip sr-chip--${focus ? 'ember' : 'spectral'}`}>⏱ {time}</span>
      {focus && <span className="sr-slidetime__flag">spend your time here</span>}
    </div>
  )
}

// Slide 0 — the timing plan itself, straight from "Your 4 Minutes — Make Them Count".
const AGENDA = [
  { time: '0:00–0:20', what: 'Problem · target user · what you built', focus: false },
  { time: '0:20–2:00', what: 'LIVE MVP demo', focus: true },
  { time: '2:00–2:45', what: 'How GitHub Copilot helped you build', focus: false },
  { time: '2:45–3:30', what: 'How $25K Azure credits help you continue / scale', focus: false },
  { time: '3:30–4:00', what: 'One judge question · transition', focus: false },
]

export function AgendaSlide() {
  return (
    <div className="sr-section__inner sr-agenda">
      <Reveal>
        <p className="sr-eyebrow">
          {siteConfig.product} · {siteConfig.hackathon}
        </p>
      </Reveal>
      <Reveal delay={60}>
        <h1 className="sr-agenda__title">
          Your 4 minutes — <em>make them count.</em>
        </h1>
      </Reveal>
      <Reveal delay={120}>
        <ol className="sr-timeline">
          {AGENDA.map((row) => (
            <li key={row.time} className={`sr-timeline__row ${row.focus ? 'is-focus' : ''}`.trim()}>
              <span className="sr-timeline__time">{row.time}</span>
              <span className="sr-timeline__what">{row.what}</span>
              {row.focus && <span className="sr-chip sr-chip--ember">spend your time here</span>}
            </li>
          ))}
        </ol>
      </Reveal>
      <Reveal delay={200}>
        <p className="sr-agenda__mantra">Demo over slides. Start with the user problem.</p>
      </Reveal>
    </div>
  )
}

// Slide 1 — 0:00–0:20 — Problem · target user · what you built.
export function ProblemSlide() {
  return (
    <div className="sr-section__inner">
      <SlideTime time="0:00–0:20" />
      <Reveal>
        <p className="sr-eyebrow">Problem · who it&apos;s for</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">
          A flat <code>AGENTS.md</code> says the same thing to everyone — and never learns.
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="sr-pitch__lede">
          Dev teams want a reviewer that knows <em>their</em> codebase. We built{' '}
          <strong>{siteConfig.product}</strong> — a GitHub Action that reviews every PR with a real
          personality and a memory of the lessons your team has already learned.
        </p>
      </Reveal>
    </div>
  )
}

// Slide 2 — 0:20–2:00 — the LIVE demo. A cue card, not a wall of text. Spend your time here.
export function DemoSlide() {
  return (
    <div className="sr-section__inner sr-cue">
      <SlideTime time="0:20–2:00" focus />
      <Reveal>
        <p className="sr-eyebrow">Live MVP demo</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-cue__title">▶ Switch to the app — show it live.</h2>
      </Reveal>
      <Reveal delay={120}>
        <ol className="sr-cue__steps">
          <li>Open a PR that adds a slug-validation regex on request input.</li>
          <li>
            {siteConfig.product}&apos;s <code>injection</code> lens recalls a past ReDoS lesson — and
            grounds its review in it.
          </li>
          <li>Open the harness: show which memories each lens retrieved.</li>
        </ol>
      </Reveal>
      <Reveal delay={180} className="sr-cue__cta">
        <Link to="/editor" className="sr-btn sr-btn--primary">
          Open the app →
        </Link>
        <a className="sr-btn sr-btn--ghost" href={siteConfig.repoUrl} target="_blank" rel="noreferrer">
          View on GitHub ↗
        </a>
      </Reveal>
    </div>
  )
}

// Slide 3 — 2:00–2:45 — how GitHub Copilot helped you build.
const COPILOT = [
  {
    k: 'Scaffolded the Action',
    body: 'Copilot generated the TypeScript pipeline — input builder, history loader, comment poster — from intent, then we refined it.',
  },
  {
    k: 'Typed core & tests',
    body: 'Pair-programmed the Zod-typed shared schemas and the vitest suites that keep every finding well-formed.',
  },
  {
    k: 'RAG retrieval',
    body: 'Built semantic retrieval on sqlite-vec with an FTS5 fallback alongside Copilot, end to end.',
  },
]

export function CopilotSlide() {
  return (
    <div className="sr-section__inner">
      <SlideTime time="2:00–2:45" />
      <Reveal>
        <p className="sr-eyebrow">How we built it</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">Built fast with GitHub Copilot.</h2>
      </Reveal>
      <div className="sr-grid-3">
        {COPILOT.map((c, i) => (
          <Reveal key={c.k} delay={120 + i * 80}>
            <div className="sr-limit">
              <h3 className="sr-limit__title">{c.k}</h3>
              <p className="sr-limit__body">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

// Slide 4 — 2:45–3:30 — how $25K Azure credits help you continue / scale.
const AZURE = [
  { k: 'Already on Azure', body: 'The site and the live harness ship on Azure Static Web Apps today.' },
  {
    k: 'Hosted memory',
    body: `$25K funds a hosted retrieval index and embeddings so ${siteConfig.product} scales to team-sized repos.`,
  },
  {
    k: 'Azure OpenAI',
    body: 'Run deterministic model calls through Azure OpenAI; credits cover the multi-repo rollout and pilots.',
  },
]

export function AzureSlide() {
  return (
    <div className="sr-section__inner">
      <SlideTime time="2:45–3:30" />
      <Reveal>
        <p className="sr-eyebrow">Continue &amp; scale</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">What $25K of Azure unlocks.</h2>
      </Reveal>
      <div className="sr-grid-3">
        {AZURE.map((c, i) => (
          <Reveal key={c.k} delay={120 + i * 80}>
            <div className="sr-limit">
              <h3 className="sr-limit__title">{c.k}</h3>
              <p className="sr-limit__body">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

// Slide 5 — 3:30–4:00 — one judge question · transition.
export function CloseSlide() {
  return (
    <div className="sr-section__inner sr-closing">
      <SlideTime time="3:30–4:00" />
      <Reveal>
        <h2 className="sr-closing__title">Ask us anything.</h2>
      </Reveal>
      <Reveal delay={80}>
        <p className="sr-pitch__lede sr-pitch__lede--center">{siteConfig.tagline}</p>
      </Reveal>
      <Reveal delay={140} className="sr-closing__cta">
        <Link to="/" className="sr-btn sr-btn--ghost">
          Back to site
        </Link>
        <a className="sr-btn sr-btn--primary" href={siteConfig.repoUrl} target="_blank" rel="noreferrer">
          View on GitHub ↗
        </a>
      </Reveal>
      <Reveal delay={200}>
        <p className="sr-closing__status">
          {siteConfig.product} · {siteConfig.hackathon}
        </p>
      </Reveal>
    </div>
  )
}
