import { ArrowUpDown } from 'lucide-react'
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
  // currentSort,
  updateSort,
  children,
  className = '',
}: SortableHeaderProps) {
  // const isActive = currentSort.field === field

  return (
    <div className={`flex items-center gap-1 group ${className}`}>
      <Button
        variant="ghost"
        onClick={() => updateSort(field)}
        className="h-auto p-0 hover:bg-transparent hover:text-foreground flex items-center gap-1 font-medium"
      >
        {children}
        <ArrowUpDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
