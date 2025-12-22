'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Typography } from '@/components/ui/typography'

interface ActionButtonProps {
  icon: LucideIcon
  label: string
  isActive: boolean
  isSuggested?: boolean
  onClick: () => void
  className?: string
}

export function ActionButton({
  icon: Icon,
  label,
  isActive,
  isSuggested,
  onClick,
  className,
}: ActionButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      className={cn(
        'relative h-auto flex-col gap-2 py-4 transition-all duration-500 ease-in-out hover:bg-muted/50 active:scale-[0.96] group',
        isActive && 'bg-muted/50',
        isSuggested && !isActive && 'border-[1.5px] border-solid border-black',
        className,
      )}
      style={{
        borderRadius: '40px',
      }}
    >
      <div className="flex items-center justify-center bg-muted rounded-full p-3">
        <Icon className={cn(isActive ? 'text-black' : 'text-foreground')} />
      </div>
      <Typography
        variant="p"
        className={cn(
          isActive ? 'text-black' : 'text-muted-foreground',
          'group-hover:text-black transition-colors duration-500 ease-in-out',
        )}
      >
        {label}
      </Typography>
      {isSuggested && !isActive && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-black animate-pulse" />
      )}
    </Button>
  )
}
