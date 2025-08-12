import { Button } from '@/components/ui/button'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
  const isCurrentField = currentSort.field === field
  const direction = isCurrentField ? currentSort.direction : null

  const getSortIcon = () => {
    if (!isCurrentField) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  return (
    <Button
      variant="ghost"
      className={cn('h-auto p-0 font-semibold hover:bg-transparent flex items-center', className)}
      onClick={() => updateSort(field)}
    >
      <div className="flex items-center">
        {children}
        {getSortIcon()}
      </div>
    </Button>
  )
}
