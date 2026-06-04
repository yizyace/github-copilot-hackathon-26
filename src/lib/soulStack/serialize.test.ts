import { describe, it, expect } from 'vitest'
import { cassandraStack } from './sample'
import { serializeSoulStack } from './serialize'

describe('serializeSoulStack', () => {
  it('emits the .soul/ tree: manifest, three md files, one journal file per memory', () => {
    const files = serializeSoulStack(cassandraStack)
    const paths = files.map((f) => f.path)

    expect(paths).toContain('.soul/manifest.yaml')
    expect(paths).toContain('.soul/soul.md')
    expect(paths).toContain('.soul/ego.md')
    expect(paths).toContain('.soul/rules.md')
    expect(paths).toContain('.soul/journal/2026-05-29-lesson-redos-in-slug-validator.md')
    expect(paths.filter((p) => p.startsWith('.soul/journal/')).length).toBe(cassandraStack.journal.length)
  })

  it('writes valid manifest fields and the journal frontmatter + body skeleton', () => {
    const files = serializeSoulStack(cassandraStack)
    const manifest = files.find((f) => f.path === '.soul/manifest.yaml')!.content
    expect(manifest).toContain('name: cassandra')
    expect(manifest).toContain('review: claude-sonnet-4-6')

    const redos = files.find((f) => f.path.endsWith('redos-in-slug-validator.md'))!.content
    expect(redos).toContain('id: lesson-2026-05-29-redos-in-slug-validator')
    expect(redos).toContain('## Context')
    expect(redos).toContain('## Application')
  })
})
