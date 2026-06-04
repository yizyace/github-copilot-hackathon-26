import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section>
      <h1>404 — Page not found</h1>
      <p className="placeholder">
        That page doesn&apos;t exist (yet).
      </p>
      <p>
        <Link to="/">← Back home</Link>
      </p>
    </section>
  )
}

export default NotFound
