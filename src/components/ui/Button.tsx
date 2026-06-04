import type { ReactNode } from 'react'
import './ui.css'

type Variant = 'primary' | 'spectral' | 'ghost'

interface ButtonProps {
  children: ReactNode
  variant?: Variant
  href?: string
  external?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  title?: string
}

// One control that renders as a link (href) or a button. Keeps the two surfaces
// visually identical whether a CTA navigates or fires an action.
export function Button({
  children,
  variant = 'primary',
  href,
  external,
  onClick,
  type = 'button',
  className = '',
  title,
}: ButtonProps) {
  const cls = `sr-btn sr-btn--${variant} ${className}`.trim()
  if (href) {
    return (
      <a className={cls} href={href} title={title} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {children}
      </a>
    )
  }
  return (
    <button className={cls} type={type} onClick={onClick} title={title}>
      {children}
    </button>
  )
}
