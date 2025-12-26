'use client'

import { Typography } from '@/components/ui/typography'
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
    <div className={cn('bg-muted/40 select-none px-4 py-2 rounded-3xl', className)}>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 transition-all duration-200 h-12 cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-100',
              isOpen && 'rotate-90',
            )}
          />
          <Typography variant="h4">{title}</Typography>
        </div>
        {isOpen && action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>

      {/* Content */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
        style={{ willChange: isOpen ? 'auto' : 'grid-template-rows' }}
      >
        <div className="overflow-hidden">
          <div>{children}</div>
        </div>
      </div>
    </div>
  )
}
