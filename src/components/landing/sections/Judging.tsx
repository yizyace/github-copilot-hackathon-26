import { Reveal } from '../Reveal'

const CRITERIA = [
  {
    k: 'Innovation & originality',
    body: 'A layered psyche (soul · ego · rules) plus an associative memory the reviewer recalls on demand. Personality is the product surface — and it evolves through guard-railed, human-ratified write-back.',
  },
  {
    k: 'Technical execution & Copilot use',
    body: 'A real GitHub Action and a Zod-typed shared core; semantic RAG on SQLite + sqlite-vec with an FTS5 fallback; parallel lens subagents; deterministic (temperature 0, prompt caching). Built with GitHub Copilot.',
  },
  {
    k: 'Impact & usefulness',
    body: "Drops into any repo via a .soul/ directory and posts native GitHub PR reviews that learn from your codebase's history. Two teams running it get genuinely different reviewers.",
  },
  {
    k: 'Demo & presentation',
    body: 'The cited-memory moment — a real PR, a review in one voice, grounded in a retrieved lesson — with the harness showing why. De-risked with an FTS fallback, a prebuilt index, and a recorded result. (This page is the deck.)',
  },
]

export function Judging() {
  return (
    <div className="sr-section__inner">
      <Reveal>
        <p className="sr-eyebrow">Why it wins</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">Built to be judged.</h2>
      </Reveal>
      <div className="sr-grid-2">
        {CRITERIA.map((c, i) => (
          <Reveal key={c.k} delay={120 + i * 80}>
            <div className="sr-criterion">
              <h3 className="sr-criterion__k">{c.k}</h3>
              <p className="sr-criterion__body">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
