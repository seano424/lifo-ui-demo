import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BatchSort, BatchSortField } from '@/lib/queries/batches'

interface SortableHeaderProps {
  field: BatchSortField
  currentSort: BatchSort
  updateSort: (field: BatchSortField) => void
  children: React.ReactNode
  className?: string
}

export function SortableHeader({
  field,
  currentSort,
  updateSort,
  children,
  className = '',
}: SortableHeaderProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        variant="ghost"
        onClick={() => updateSort(field)}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        <div className="flex items-center gap-1">
          {children}
          {currentSort.field === field ? (
            currentSort.direction === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4" />
          )}
        </div>
      </Button>
    </div>
  )
}
