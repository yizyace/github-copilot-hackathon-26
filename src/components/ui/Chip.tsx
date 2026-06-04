import type { ReactNode } from 'react'
import './ui.css'

interface ChipProps {
  children: ReactNode
  tone?: 'default' | 'ember' | 'spectral'
  className?: string
}

export function Chip({ children, tone = 'default', className = '' }: ChipProps) {
  return <span className={`sr-chip sr-chip--${tone} ${className}`.trim()}>{children}</span>
}
