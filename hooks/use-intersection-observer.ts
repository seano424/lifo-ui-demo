import { useCallback, useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  enabled?: boolean
  debounceMs?: number
}

// Debounce utility for performance optimization
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: unknown[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function useIntersectionObserver({
  root = null,
  rootMargin = '100px', // Conservative default for better performance
  threshold = 0,
  enabled = true,
  debounceMs = 100, // Debounce intersection events
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const targetRef = useRef<HTMLDivElement>(null)

  // Debounced setter to avoid rapid state updates
  const debouncedSetIntersecting = useCallback(
    debounce((...args: unknown[]) => {
      const intersecting = args[0] as boolean
      setIsIntersecting(intersecting)
    }, debounceMs),
    [],
  )

  // Memoized intersection callback
  const handleIntersection = useCallback(
    ([entry]: IntersectionObserverEntry[]) => {
      if (enabled && entry) {
        debouncedSetIntersecting(entry.isIntersecting)
      }
    },
    [enabled, debouncedSetIntersecting],
  )

  useEffect(() => {
    if (!enabled || !targetRef.current) return

    const observer = new IntersectionObserver(handleIntersection, {
      root,
      rootMargin,
      threshold,
    })

    const currentTarget = targetRef.current
    observer.observe(currentTarget)

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
      observer.disconnect()
    }
  }, [root, rootMargin, threshold, enabled, handleIntersection])

  return { targetRef, isIntersecting }
}
