import { useState } from 'react'
import {
  JOURNAL_TYPES,
  type Confidence,
  type JournalEntry,
  type JournalType,
  type MemorySource,
} from '../../lib/soulStack/types'
import { SelectField, TextAreaField, TextField } from './fields'

const csv = (a?: string[]) => (a ?? []).join(', ')
const parseCsv = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

function blankEntry(): JournalEntry {
  return {
    id: 'lesson-2026-01-01-new-entry',
    type: 'lesson',
    title: '',
    date: '2026-01-01',
    summary: '',
    tags: [],
    source: 'agent',
    confidence: 'med',
    context: '',
    insight: '',
    application: '',
  }
}

export function JournalEditor({
  entries,
  onChange,
}: {
  entries: JournalEntry[]
  onChange: (e: JournalEntry[]) => void
}) {
  const [sel, setSel] = useState(0)
  const entry = entries[sel]
  const update = (patch: Partial<JournalEntry>) =>
    onChange(entries.map((e, i) => (i === sel ? { ...e, ...patch } : e)))
  const add = () => {
    onChange([...entries, blankEntry()])
    setSel(entries.length)
  }
  const remove = (i: number) => {
    onChange(entries.filter((_, j) => j !== i))
    setSel(Math.max(0, i - 1))
  }

  return (
    <div className="sr-ed-file">
      <div className="sr-ed-file__head">
        <h2 className="sr-ed-file__title">journal/</h2>
        <button type="button" className="sr-mini-btn" onClick={add}>
          + New entry
        </button>
      </div>

      <div className="sr-journal">
        <ul className="sr-journal__list">
          {entries.map((e, i) => (
            <li key={i}>
              <button
                type="button"
                className={`sr-journal__item ${i === sel ? 'is-active' : ''}`.trim()}
                onClick={() => setSel(i)}
              >
                <span className="sr-journal__type">{e.type}</span>
                <span className="sr-journal__title">{e.title || e.id}</span>
              </button>
            </li>
          ))}
        </ul>

        {entry ? (
          <div className="sr-journal__form">
            <SelectField
              label="type"
              value={entry.type}
              options={JOURNAL_TYPES}
              onChange={(v) => update({ type: v as JournalType })}
            />
            <TextField label="id" value={entry.id} mono onChange={(v) => update({ id: v })} />
            <TextField label="title" value={entry.title} onChange={(v) => update({ title: v })} />
            <TextField
              label="date (YYYY-MM-DD)"
              value={entry.date}
              mono
              onChange={(v) => update({ date: v })}
            />
            <TextAreaField
              label="summary (the text embedded for retrieval)"
              value={entry.summary}
              rows={3}
              onChange={(v) => update({ summary: v })}
            />
            <TextField
              label="tags (comma-separated)"
              value={csv(entry.tags)}
              onChange={(v) => update({ tags: parseCsv(v) })}
            />
            <TextField
              label="files_touched (comma-separated)"
              value={csv(entry.filesTouched)}
              mono
              onChange={(v) => update({ filesTouched: parseCsv(v) })}
            />
            <TextField
              label="related_pr"
              value={entry.relatedPr ?? ''}
              onChange={(v) => update({ relatedPr: v || undefined })}
            />
            <TextField
              label="see_also (comma-separated ids)"
              value={csv(entry.seeAlso)}
              mono
              onChange={(v) => update({ seeAlso: parseCsv(v) })}
            />
            <SelectField
              label="source"
              value={entry.source ?? 'agent'}
              options={['agent', 'human']}
              onChange={(v) => update({ source: v as MemorySource })}
            />
            <SelectField
              label="confidence"
              value={entry.confidence ?? 'med'}
              options={['low', 'med', 'high']}
              onChange={(v) => update({ confidence: v as Confidence })}
            />
            <TextAreaField label="## Context" value={entry.context} rows={3} onChange={(v) => update({ context: v })} />
            <TextAreaField label="## Insight" value={entry.insight} rows={3} onChange={(v) => update({ insight: v })} />
            <TextAreaField
              label="## Application"
              value={entry.application}
              rows={3}
              onChange={(v) => update({ application: v })}
            />
            <button
              type="button"
              className="sr-mini-btn sr-mini-btn--danger"
              onClick={() => remove(sel)}
            >
              Delete entry
            </button>
          </div>
        ) : (
          <p className="sr-ed-hint">No journal entries yet — add one.</p>
        )}
      </div>
    </div>
  )
}
