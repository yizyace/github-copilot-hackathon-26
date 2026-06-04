import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/theme.css'
import '../components/editor/editor.css'
import { patternBuddyStack } from '../lib/soulStack/sample'
import type { SoulStack } from '../lib/soulStack/types'
import { SIZE_LIMITS, countIssues, validateSoulStack } from '../lib/soulStack/validate'
import { clearStack, loadStack, saveStack } from '../lib/soulStack/storage'
import { downloadSoulZip } from '../lib/soulStack/exportZip'
import { ManifestForm } from '../components/editor/ManifestForm'
import { MarkdownFile } from '../components/editor/MarkdownFile'
import { JournalEditor } from '../components/editor/JournalEditor'
import { SidePanel } from '../components/editor/SidePanel'
import { DemoReviewPanel } from '../components/editor/DemoReviewPanel'

type Target = 'manifest' | 'soul' | 'ego' | 'rules' | 'journal'

function Editor() {
  const [stack, setStack] = useState<SoulStack>(() => loadStack(structuredClone(patternBuddyStack)))
  const [target, setTarget] = useState<Target>('manifest')
  const [demoOpen, setDemoOpen] = useState(false)

  useEffect(() => {
    saveStack(stack)
  }, [stack])

  const issues = useMemo(() => validateSoulStack(stack), [stack])
  const { errors, warnings } = countIssues(issues)

  const loadSample = () => {
    setStack(structuredClone(patternBuddyStack))
    setTarget('manifest')
  }
  const reset = () => {
    clearStack()
    loadSample()
  }

  const nav: { key: Target; label: string }[] = [
    { key: 'manifest', label: 'manifest.yaml' },
    { key: 'soul', label: 'soul.md' },
    { key: 'ego', label: 'ego.md' },
    { key: 'rules', label: 'rules.md' },
    { key: 'journal', label: `journal/ · ${stack.journal.length}` },
  ]

  return (
    <div className="theme-soul sr-editor">
      <a className="sr-skip" href="#main-content">
        Skip to editor
      </a>
      <header className="sr-editor__bar">
        <div className="sr-editor__brandwrap">
          <Link to="/" className="sr-editor__brand">
            <span aria-hidden="true">◆</span> Soul Review
          </Link>
          <span className="sr-editor__title">Soul editor</span>
        </div>
        <div className="sr-editor__actions">
          <span role="status" className={`sr-editor__status ${errors ? 'is-bad' : ''}`.trim()}>
            {errors === 0 && warnings === 0 ? '✓ valid' : `${errors} err · ${warnings} warn`}
          </span>
          <button type="button" className="sr-btn sr-btn--ghost" onClick={loadSample}>
            Load PatternBuddy
          </button>
          <button type="button" className="sr-btn sr-btn--ghost" onClick={reset}>
            Reset
          </button>
          <button type="button" className="sr-btn sr-btn--spectral" onClick={() => setDemoOpen(true)}>
            Run demo review
          </button>
          <button type="button" className="sr-btn sr-btn--primary" onClick={() => downloadSoulZip(stack)}>
            Export .soul/
          </button>
        </div>
      </header>

      <div className="sr-editor__body">
        <nav className="sr-editor__nav" aria-label="Soul Stack files">
          {nav.map((n) => (
            <button
              key={n.key}
              type="button"
              className={`sr-navitem ${target === n.key ? 'is-active' : ''}`.trim()}
              aria-current={target === n.key ? 'true' : undefined}
              onClick={() => setTarget(n.key)}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <main id="main-content" tabIndex={-1} className="sr-editor__main">
          {target === 'manifest' && (
            <ManifestForm value={stack.manifest} onChange={(m) => setStack((s) => ({ ...s, manifest: m }))} />
          )}
          {target === 'soul' && (
            <MarkdownFile
              filename="soul.md"
              value={stack.soul}
              limit={SIZE_LIMITS.soul}
              hint="Who the reviewer is — ranked values, voice. Keep it short."
              onChange={(v) => setStack((s) => ({ ...s, soul: v }))}
            />
          )}
          {target === 'ego' && (
            <MarkdownFile
              filename="ego.md"
              value={stack.ego}
              limit={SIZE_LIMITS.ego}
              hint="How it behaves now — short stances with [[journal-id]] pointers into the journal."
              onChange={(v) => setStack((s) => ({ ...s, ego: v }))}
            />
          )}
          {target === 'rules' && (
            <MarkdownFile
              filename="rules.md"
              value={stack.rules}
              limit={{ lines: SIZE_LIMITS.rules.lines }}
              hint="Hard MUST / MUST-NOT policy and the output contract. Human-owned."
              onChange={(v) => setStack((s) => ({ ...s, rules: v }))}
            />
          )}
          {target === 'journal' && (
            <JournalEditor entries={stack.journal} onChange={(j) => setStack((s) => ({ ...s, journal: j }))} />
          )}
        </main>

        <SidePanel stack={stack} issues={issues} />
      </div>

      {demoOpen && <DemoReviewPanel onClose={() => setDemoOpen(false)} />}
    </div>
  )
}

export default Editor
