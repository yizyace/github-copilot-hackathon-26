import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Editor from './Editor'

// jsdom doesn't implement the native <dialog> modal methods the panel relies on.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
})

describe('Editor', () => {
  beforeEach(() => localStorage.clear())

  it('seeds with the PatternBuddy sample and offers validation + export', () => {
    render(
      <MemoryRouter>
        <Editor />
      </MemoryRouter>,
    )
    expect(screen.getByText('Soul editor')).toBeInTheDocument()
    // Persona preview reflects the seeded sample.
    expect(screen.getByText('PatternBuddy')).toBeInTheDocument()
    expect(screen.getByText(/well-formed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export \.soul/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run review/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update repo/i })).toBeInTheDocument()
  })

  it('opens the review panel when "Run review" is clicked', async () => {
    render(
      <MemoryRouter>
        <Editor />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /run review/i }))
    expect(await screen.findByRole('heading', { name: /demo review/i })).toBeInTheDocument()
  })
})
