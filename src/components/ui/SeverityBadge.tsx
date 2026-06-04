import type { Severity } from '../../lib/review/types'
import './ui.css'

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone = severity === 'blocking' ? 'blocking' : 'soft'
  return <span className={`sr-sev sr-sev--${tone}`}>{severity}</span>
}
