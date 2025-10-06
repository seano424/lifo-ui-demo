import { useLocale, useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { getLocalizedCategoryName } from '@/lib/category-translations'
import type { Category } from '@/lib/queries/products'
import { useCategories } from '@/hooks/use-categories'

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
  const t = useTranslations('productFilters')
  const locale = useLocale()
  const { categories, isLoading: categoriesLoading } = useCategories()

  const getCategoryDisplayName = (category: Category) => {
    return getLocalizedCategoryName(category, locale)
  }

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
        <SelectTrigger className="lg:w-[180px] text-nowrap">
          <SelectValue placeholder={t('categoryFilter')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allCategories')}</SelectItem>
          {categories.map(category => (
            <SelectItem key={category.category_code} value={category.category_code}>
              {getCategoryDisplayName(category)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && (
        <Skeleton className="justify-between gap-1 hidden md:flex">
          <Skeleton className="h-5 w-6 bg-muted-foreground/10" />
          <Skeleton className="h-5 w-16 bg-muted-foreground/10" />
        </Skeleton>
      )}
      {!isLoading && count > 0 && (
        <span className="text-sm items-center text-muted-foreground px-2 hidden md:flex">
          {t('productCount', { count })}
        </span>
      )}
    </div>
  )
}
