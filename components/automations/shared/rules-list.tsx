import type { ReactNode } from 'react'
import { Typography } from '@/components/ui/typography'

interface RulesListProps {
  isLoading: boolean
  skeleton: ReactNode
  isEmpty: boolean
  emptyMessage: ReactNode
  children: ReactNode
}

export function RulesList({
  isLoading,
  skeleton,
  isEmpty,
  emptyMessage,
  children,
}: RulesListProps) {
  if (isLoading) {
    return <>{skeleton}</>
  }

  return (
    <div className="border-[1.5px] border-border rounded-2xl overflow-hidden">
      <div className="divide-y divide-border">
        {children}
        {isEmpty && (
          <div className="py-12 text-center">
            <Typography variant="p" color="muted">
              {emptyMessage}
            </Typography>
          </div>
        )}
      </div>
    </div>
  )
}
