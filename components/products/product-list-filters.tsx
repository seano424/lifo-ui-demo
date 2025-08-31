import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchCategories } from '@/lib/queries/products'

interface Category {
  category_id: string
  category_code: string
  display_name_en: string
  display_name_fr: string
  product_count?: number
}

interface ProductListFiltersProps {
  filters?: {
    category?: string
  }
  onFiltersChange?: (filters: { category?: string }) => void
  count: number
  isLoading: boolean
}

export function ProductListFilters({
  filters,
  onFiltersChange,
  count,
  isLoading,
}: ProductListFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true)
        const data = await fetchCategories()
        setCategories(data)
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setCategoriesLoading(false)
      }
    }

    loadCategories()
  }, [])

  if (!onFiltersChange) {
    return null
  }

  return (
    <div className="flex flex-col-reverse items-center md:flex-row justify-end gap-2">
      <Select
        value={filters?.category || 'all'}
        onValueChange={value =>
          onFiltersChange({
            ...filters,
            category: value === 'all' ? undefined : value,
          })
        }
        disabled={isLoading || categoriesLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map(category => (
            <SelectItem key={category.category_code} value={category.category_code}>
              {category.display_name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && (
        <Skeleton className="flex justify-between gap-1">
          <Skeleton className="h-5 w-6 bg-muted-foreground/10" />
          <Skeleton className="h-5 w-16 bg-muted-foreground/10" />
        </Skeleton>
      )}
      {!isLoading && count > 0 && (
        <span className="text-sm flex items-center text-muted-foreground px-2">
          {count} products
        </span>
      )}
    </div>
  )
}
