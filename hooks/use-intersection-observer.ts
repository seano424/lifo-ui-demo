import { useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  enabled?: boolean
}

export function useIntersectionObserver({
  root = null,
  rootMargin = '200px', // Start loading 200px before the element comes into view
  threshold = 0,
  enabled = true,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const targetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !targetRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        root,
        rootMargin,
        threshold,
      },
    )

    const currentTarget = targetRef.current
    observer.observe(currentTarget)

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [root, rootMargin, threshold, enabled])

  return { targetRef, isIntersecting }
}
