import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Editor from './Editor'

describe('Editor', () => {
  beforeEach(() => localStorage.clear())

  it('seeds with the Cassandra sample and offers validation + export', () => {
    render(
      <MemoryRouter>
        <Editor />
      </MemoryRouter>,
    )
    expect(screen.getByText('Soul editor')).toBeInTheDocument()
    // Persona preview reflects the seeded sample.
    expect(screen.getByText('Cassandra')).toBeInTheDocument()
    expect(screen.getByText(/well-formed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export \.soul/i })).toBeInTheDocument()
  })
})
