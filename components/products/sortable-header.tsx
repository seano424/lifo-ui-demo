import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProductSort, SortField } from '@/lib/queries/products'
import { cn } from '@/lib/utils'

interface SortableHeaderProps {
  field: SortField
  children: React.ReactNode
  currentSort: ProductSort
  updateSort: (field: SortField) => void
  className?: string
}

export function SortableHeader({
  field,
  children,
  currentSort,
  updateSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort.field === field

  return (
    <div className={cn('flex items-center gap-1 group', className)}>
      <Button
        variant="ghost"
        onClick={() => updateSort(field)}
        className="h-auto p-0 hover:bg-transparent hover:text-foreground"
      >
        <div className="flex items-center gap-1">
          <span className="text-sm text-foreground">{children}</span>
          {isActive ? (
            currentSort.direction === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : null}
        </div>
      </Button>
    </div>
  )
}
