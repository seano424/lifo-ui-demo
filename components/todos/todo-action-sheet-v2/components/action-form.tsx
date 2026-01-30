'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ActionFormProps {
  isOpen: boolean
  children: ReactNode
  className?: string
}

export function ActionForm({ isOpen, children, className }: ActionFormProps) {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0',
        className,
      )}
    >
      <div className="bg-[rgba(0,0,0,0.02)] rounded-2xl p-5 flex flex-col gap-4">{children}</div>
    </div>
  )
}
