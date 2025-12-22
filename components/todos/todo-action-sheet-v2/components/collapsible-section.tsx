'use client'

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  action?: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  action,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('border-b border-[rgba(0,0,0,0.06)]', className)}>
      <div className="flex w-full items-center justify-between py-4 transition-all duration-200">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 text-[#86868b] transition-transform duration-200',
              isOpen && 'rotate-90',
            )}
          />
          <span className="text-base font-semibold text-[#1d1d1f]">{title}</span>
        </button>
        {isOpen && action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="pb-4">{children}</div>
      </div>
    </div>
  )
}
