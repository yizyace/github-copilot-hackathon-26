import { describe, it, expect } from 'vitest'
import { cassandraStack } from './sample'
import {
  countWords,
  countLines,
  extractPointers,
  journalFilename,
  validateSoulStack,
  countIssues,
} from './validate'
import type { SoulStack } from './types'

const clone = (s: SoulStack): SoulStack => structuredClone(s)

describe('text helpers', () => {
  it('counts words and lines', () => {
    expect(countWords('one two  three\nfour')).toBe(4)
    expect(countWords('   ')).toBe(0)
    expect(countLines('a\nb\nc')).toBe(3)
    expect(countLines('')).toBe(0)
  })

  it('extracts [[id]] pointers', () => {
    expect(extractPointers('see [[lesson-2026-05-29-redos-in-slug-validator]] and [[decision-2026-02-02-auth-dir-is-blocking]]')).toEqual([
      'lesson-2026-05-29-redos-in-slug-validator',
      'decision-2026-02-02-auth-dir-is-blocking',
    ])
    expect(extractPointers('no pointers here')).toEqual([])
  })

  it('derives the journal filename from date + type + slug', () => {
    const entry = cassandraStack.journal.find((e) => e.id === 'lesson-2026-05-29-redos-in-slug-validator')!
    expect(journalFilename(entry)).toBe('2026-05-29-lesson-redos-in-slug-validator.md')
  })
})

describe('validateSoulStack', () => {
  it('accepts the Cassandra sample with no errors', () => {
    const issues = validateSoulStack(cassandraStack)
    expect(countIssues(issues).errors).toBe(0)
  })

  it('flags an unresolved [[pointer]] as a warning', () => {
    const stack = clone(cassandraStack)
    stack.ego += '\n- A dangling reference [[lesson-9999-01-01-does-not-exist]]'
    const issues = validateSoulStack(stack)
    expect(issues.some((i) => i.level === 'warning' && i.message.includes('lesson-9999-01-01-does-not-exist'))).toBe(true)
  })

  it('errors when no lens is enabled', () => {
    const stack = clone(cassandraStack)
    stack.manifest.lenses.forEach((l) => (l.enabled = false))
    const issues = validateSoulStack(stack)
    expect(issues.some((i) => i.level === 'error' && i.field === 'lenses')).toBe(true)
  })

  it('errors on a duplicate journal id', () => {
    const stack = clone(cassandraStack)
    stack.journal.push(structuredClone(stack.journal[0]))
    const issues = validateSoulStack(stack)
    expect(issues.some((i) => i.level === 'error' && i.field === 'id' && i.message.includes('Duplicate'))).toBe(true)
  })

  it('errors when soul.md blows past the hard line ceiling', () => {
    const stack = clone(cassandraStack)
    stack.soul = Array.from({ length: 70 }, (_, i) => `line ${i}`).join('\n')
    const issues = validateSoulStack(stack)
    expect(issues.some((i) => i.level === 'error' && i.file === 'soul.md')).toBe(true)
  })

  it('errors on a malformed journal date', () => {
    const stack = clone(cassandraStack)
    stack.journal[0].date = '05/29/2026'
    const issues = validateSoulStack(stack)
    expect(issues.some((i) => i.level === 'error' && i.field === 'date')).toBe(true)
  })
})
