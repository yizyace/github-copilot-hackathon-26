import { Link } from 'react-router-dom'
import { Reveal } from '../Reveal'
import { Button } from '../../ui/Button'
import { siteConfig } from '../../../config'

export function Closing() {
  return (
    <div className="sr-section__inner sr-closing">
      <Reveal>
        <h2 className="sr-closing__title">
          Give your repo a reviewer
          <br />
          with a soul — and a memory.
        </h2>
      </Reveal>
      <Reveal delay={100} className="sr-closing__cta">
        <Link to="/editor" className="sr-btn sr-btn--primary">
          Open the Soul editor →
        </Link>
        <Button variant="ghost" href={siteConfig.repoUrl} external>
          View on GitHub ↗
        </Button>
      </Reveal>
      <Reveal delay={160}>
        <p className="sr-closing__status">🚧 Hackathon WIP · {siteConfig.hackathon}</p>
      </Reveal>
      <Reveal delay={200}>
        <p className="sr-footer">The app &amp; pipeline are being built — this page is the pitch.</p>
      </Reveal>
    </div>
  )
}
