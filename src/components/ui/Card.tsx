import type { ReactNode } from 'react'
import './ui.css'

interface CardProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}

export function Card({ children, className = '', as: Tag = 'div' }: CardProps) {
  return <Tag className={`sr-card ${className}`.trim()}>{children}</Tag>
}
