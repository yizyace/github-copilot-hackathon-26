import { Reveal } from '../Reveal'

const STEPS = [
  { k: 'Load', d: 'Read the .soul/ stack — the short, always-loaded identity.' },
  { k: 'Retrieve', d: 'Semantic RAG over journal/*.md (sqlite-vec, FTS5 fallback) — only memories relevant to the diff.' },
  { k: 'Lenses', d: 'Fan out to per-concern subagents — parallel Anthropic Messages API calls.' },
  { k: 'Synthesize', d: 'Merge findings into one review in a single voice, grounded in cited memories.' },
]

const ENTRYPOINTS = [
  { k: 'GitHub Action', d: 'Runs on pull_request, fetches the diff via Octokit, posts one native PR review with inline comments.' },
  { k: 'Local harness', d: 'A Vite + React app that runs the same review on a branch and shows which memories each lens retrieved.' },
]

export function HowItWorks() {
  return (
    <div className="sr-section__inner">
      <Reveal>
        <p className="sr-eyebrow">Runtime</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">One core. Two entrypoints.</h2>
      </Reveal>
      <ol className="sr-pipeline">
        {STEPS.map((s, i) => (
          <Reveal key={s.k} delay={100 + i * 80}>
            <li className="sr-step">
              <span className="sr-step__n">{i + 1}</span>
              <span className="sr-step__k">{s.k}</span>
              <p className="sr-step__d">{s.d}</p>
            </li>
          </Reveal>
        ))}
      </ol>
      <div className="sr-grid-2">
        {ENTRYPOINTS.map((e, i) => (
          <Reveal key={e.k} delay={460 + i * 90}>
            <div className="sr-entry">
              <h3 className="sr-entry__k">{e.k}</h3>
              <p className="sr-entry__d">{e.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
