import { Reveal } from '../Reveal'
import { Button } from '../../ui/Button'
import { Chip } from '../../ui/Chip'
import { ReviewCard } from '../../ui/ReviewCard'
import { sampleReviewResult } from '../../../lib/review/sampleReviewResult'
import { siteConfig } from '../../../config'

export function Hero({ onSeeDemo }: { onSeeDemo: () => void }) {
  return (
    <div className="sr-section__inner sr-hero">
      <div className="sr-hero__copy">
        <Reveal>
          <Chip tone="ember">{siteConfig.hackathon}</Chip>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="sr-hero__title">
            A reviewer with a soul.
            <br />
            <em>And a memory.</em>
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="sr-hero__sub">
            Soul Review is a GitHub Action that drops a code reviewer with a personality and a
            memory into your repo — not a flat <code>AGENTS.md</code> that says the same thing to
            everyone, but a reviewer with values, a role on your team, hard rules, and a journal it
            recalls when it&apos;s relevant to the PR in front of it.
          </p>
        </Reveal>
        <Reveal delay={240} className="sr-hero__cta">
          <Button variant="primary" onClick={onSeeDemo}>
            Watch it cite a memory ↓
          </Button>
          <Button variant="ghost" href={siteConfig.repoUrl} external>
            View on GitHub ↗
          </Button>
        </Reveal>
      </div>
      <Reveal delay={200} className="sr-hero__card">
        <ReviewCard result={sampleReviewResult} />
      </Reveal>
    </div>
  )
}
