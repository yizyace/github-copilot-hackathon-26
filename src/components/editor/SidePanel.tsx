import type { SoulStack } from '../../lib/soulStack/types'
import { countIssues, type ValidationIssue } from '../../lib/soulStack/validate'

export function SidePanel({ stack, issues }: { stack: SoulStack; issues: ValidationIssue[] }) {
  const { errors, warnings } = countIssues(issues)
  const enabledLenses = stack.manifest.lenses.filter((l) => l.enabled).length

  return (
    <aside className="sr-side">
      <section className="sr-side__block">
        <h3 className="sr-side__h">Persona preview</h3>
        <div className="sr-persona">
          <span className="sr-persona__avatar" aria-hidden="true">
            {stack.manifest.persona.avatar || '🙂'}
          </span>
          <div className="sr-persona__who">
            <span className="sr-persona__name">{stack.manifest.persona.displayName || '(unnamed)'}</span>
            <span className="sr-persona__tag">{stack.manifest.persona.tagline}</span>
          </div>
        </div>
        <ul className="sr-persona__stats">
          <li>
            <b>{enabledLenses}</b> lenses enabled
          </li>
          <li>
            <b>{stack.journal.length}</b> journal entries
          </li>
          <li>
            <code>{stack.manifest.models.review}</code>
          </li>
        </ul>
      </section>

      <section className="sr-side__block">
        <h3 className="sr-side__h">
          Validation{' '}
          {errors === 0 && warnings === 0 ? (
            <span className="sr-side__ok-tag">✓ clean</span>
          ) : (
            <span className="sr-side__count">
              {errors} error{errors === 1 ? '' : 's'} · {warnings} warning{warnings === 1 ? '' : 's'}
            </span>
          )}
        </h3>
        {issues.length === 0 ? (
          <p className="sr-side__ok">This Soul Stack is well-formed.</p>
        ) : (
          <ul className="sr-issues">
            {issues.map((iss, i) => (
              <li key={i} className={`sr-issue sr-issue--${iss.level}`}>
                <span className="sr-issue__file">
                  {iss.file}
                  {iss.field ? ` · ${iss.field}` : ''}
                </span>
                <span className="sr-issue__msg">{iss.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
