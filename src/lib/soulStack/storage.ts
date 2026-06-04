import type { SoulStack } from './types'

const KEY = 'soul-review:stack:v1'

// Best-effort persistence — never throws (private mode / quota / no storage).
export function loadStack(fallback: SoulStack): SoulStack {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SoulStack) : fallback
  } catch {
    return fallback
  }
}

export function saveStack(stack: SoulStack): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stack))
  } catch {
    // ignore — autosave is a convenience, not a guarantee
  }
}

export function clearStack(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
