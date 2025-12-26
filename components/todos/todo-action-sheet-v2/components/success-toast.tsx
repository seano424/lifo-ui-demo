'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SuccessToastProps {
  message: string
  show: boolean
  onHide: () => void
  duration?: number
}

export function SuccessToast({ message, show, onHide, duration = 3000 }: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      // Small delay to trigger animation
      setTimeout(() => setIsVisible(true), 10)

      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onHide, 250) // Wait for fade out animation
      }, duration)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [show, duration, onHide])

  if (!show) return null

  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-3 rounded-xl',
        'bg-[#1d1d1f] text-white shadow-lg',
        'transition-all duration-250 ease-out',
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95',
      )}
      style={{
        animation: isVisible ? 'toast-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
      }}
    >
      <CheckCircle2 className="h-5 w-5" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
