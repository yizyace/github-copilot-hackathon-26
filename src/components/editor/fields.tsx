import type { ReactNode } from 'react'
import './editor.css'

export function TextField({
  label,
  value,
  onChange,
  mono,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
  placeholder?: string
}) {
  return (
    <label className="sr-field">
      <span className="sr-field__label">{label}</span>
      <input
        className={`sr-input ${mono ? 'is-mono' : ''}`.trim()}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <label className="sr-field">
      <span className="sr-field__label">{label}</span>
      <input
        className="sr-input"
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  mono?: boolean
}) {
  return (
    <label className="sr-field">
      <span className="sr-field__label">{label}</span>
      <textarea
        className={`sr-input sr-input--area ${mono ? 'is-mono' : ''}`.trim()}
        rows={rows}
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="sr-field">
      <span className="sr-field__label">{label}</span>
      <select className="sr-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="sr-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="sr-fieldset">
      <legend className="sr-legend">{legend}</legend>
      {children}
    </fieldset>
  )
}
