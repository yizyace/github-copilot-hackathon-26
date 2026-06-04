import { Reveal } from '../Reveal'
import { Chip } from '../../ui/Chip'

const LAYERS = [
  { file: 'soul.md', layer: 'Identity', loaded: 'always', mutable: 'rarely', desc: 'Who the reviewer is — ranked values, philosophy, voice.' },
  { file: 'ego.md', layer: 'Disposition', loaded: 'always', mutable: 'slowly', desc: 'The role it has grown into on your team; an index into the journal.' },
  { file: 'rules.md', layer: 'Policy', loaded: 'always', mutable: 'human', desc: 'Hard MUST / MUST-NOT constraints and the output contract.' },
  { file: 'journal/*.md', layer: 'Memory', loaded: 'on demand', mutable: 'append-only', desc: 'Long-form memories — decisions, lessons, interactions — fetched by RAG.' },
  { file: 'manifest.yaml', layer: 'Config', loaded: 'always', mutable: 'human', desc: 'The wiring: models, lenses, retrieval, paths.' },
]

export function SoulStack() {
  return (
    <div className="sr-section__inner">
      <Reveal>
        <p className="sr-eyebrow">A layered psyche + an associative memory</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">The Soul Stack</h2>
      </Reveal>
      <div className="sr-stack">
        {LAYERS.map((l, i) => (
          <Reveal key={l.file} delay={100 + i * 70}>
            <div className="sr-layer">
              <code className="sr-layer__file">{l.file}</code>
              <span className="sr-layer__name">{l.layer}</span>
              <p className="sr-layer__desc">{l.desc}</p>
              <div className="sr-layer__tags">
                <Chip tone={l.loaded === 'on demand' ? 'spectral' : 'default'}>{l.loaded}</Chip>
                <Chip>{l.mutable}</Chip>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={520}>
        <p className="sr-callout">
          The trick: keep <code>soul.md</code> and <code>ego.md</code> short. The depth lives in the
          journal and is fetched <em>only when the PR makes it relevant</em> — the personality files
          stay skimmable; the journal carries the weight.
        </p>
      </Reveal>
    </div>
  )
}
