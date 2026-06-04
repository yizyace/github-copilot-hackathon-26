import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App routing', () => {
  it('renders the landing at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /a reviewer with a soul/i }),
    ).toBeInTheDocument()
    // The deck links through to the editor.
    expect(screen.getAllByRole('link', { name: /editor/i }).length).toBeGreaterThan(0)
  })

  it('renders the chrome nav on the secondary pages', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Docs' })).toBeInTheDocument()
  })
})
