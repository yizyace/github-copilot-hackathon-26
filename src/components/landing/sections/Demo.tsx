import { Reveal } from '../Reveal'
import { ReviewCard } from '../../ui/ReviewCard'
import { LensCard } from '../../ui/LensCard'
import { sampleReviewResult } from '../../../lib/review/sampleReviewResult'

export function Demo() {
  return (
    <div className="sr-section__inner sr-demo">
      <Reveal>
        <p className="sr-eyebrow">The north-star demo</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">Watch it cite a memory.</h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="sr-demo__lede">
          A PR adds a slug-validation regex on request input. PatternBuddy&apos;s <code>injection</code>{' '}
          lens retrieves a past ReDoS lesson — and grounds her review in it. The harness shows the
          same run&apos;s internals: which memories each lens retrieved.
        </p>
      </Reveal>
      <div className="sr-demo__grid">
        <Reveal delay={160} className="sr-demo__review">
          <ReviewCard result={sampleReviewResult} />
        </Reveal>
        <div className="sr-demo__lenses">
          {sampleReviewResult.lenses.map((l, i) => (
            <Reveal key={l.id} delay={220 + i * 80}>
              <LensCard lens={l} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
