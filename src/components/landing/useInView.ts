import { useEffect, useRef, useState } from 'react'

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Reveal-on-scroll. Falls back to immediately visible when IntersectionObserver
// is unavailable (jsdom/tests) or the user prefers reduced motion.
export function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null)
  // Start visible when we can't (or shouldn't) observe — no setState in the effect body.
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === 'undefined' || prefersReducedMotion(),
  )

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            obs.unobserve(e.target)
          }
        }
      },
      { threshold: 0.18, ...options },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView, options])

  return { ref, inView }
}
