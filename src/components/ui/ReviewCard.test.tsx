import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewCard } from './ReviewCard'
import { sampleReviewResult } from '../../lib/review/sampleReviewResult'

describe('ReviewCard', () => {
  it('renders the persona, the verdict, and the cited memory', () => {
    render(<ReviewCard result={sampleReviewResult} />)

    expect(screen.getByText('Cassandra')).toBeInTheDocument()
    expect(screen.getByText('Changes requested')).toBeInTheDocument()
    // The citation chip surfaces the grounding journal id.
    expect(screen.getByText('lesson-2026-05-29-redos-in-slug-validator')).toBeInTheDocument()
  })
})
