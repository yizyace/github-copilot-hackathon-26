import { Link } from 'react-router-dom'
import { siteConfig } from '../../config'

export function Header() {
  return (
    <header className="sr-header">
      <Link to="/" className="sr-wordmark" aria-label="Pattern Buddy — home">
        <span className="sr-wordmark__glyph" aria-hidden="true">
          ◆
        </span>
        <span className="sr-wordmark__text">Pattern Buddy</span>
      </Link>
      <nav className="sr-header__nav" aria-label="Primary">
        <Link to="/pitch" className="sr-header__link">
          Pitch
        </Link>
        <Link to="/editor" className="sr-header__link">
          Try the editor
        </Link>
        <a className="sr-header__link" href={siteConfig.repoUrl} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </nav>
    </header>
  )
}
