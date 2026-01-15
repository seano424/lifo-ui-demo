import { useLocale, useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useCategories } from '@/hooks/use-categories'
import type { Category } from '@/lib/queries/products'

interface ProductListFiltersProps {
  filters?: {
    category?: string
  }
  onFiltersChange?: (filters: { category?: string }) => void
  isLoading: boolean
}

export function ProductListFilters({
  filters,
  onFiltersChange,
  isLoading,
}: ProductListFiltersProps) {
  const t = useTranslations('productFilters')
  const tCategories = useTranslations('productCategories')
  const locale = useLocale()
  const { categories, isLoading: categoriesLoading } = useCategories()

  const getCategoryDisplayName = (category: Category) => {
    // Try to get translation from i18n first
    try {
      const translation = tCategories(category.category_code)
      if (translation && translation !== category.category_code && translation.length > 0) {
        return translation
      }
    } catch {
      // Translation not found, fall through to fallback
    }

    // Fallback to database field based on locale
    switch (locale) {
      case 'fr':
        return category.display_name_fr || category.display_name_en
      case 'nl':
        return category.display_name_nl || category.display_name_en
      default:
        return category.display_name_en
    }
  }

  if (!onFiltersChange) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
        <SelectTrigger className="w-[180px]" hideChevron>
          <SelectValue placeholder={t('categoryFilter')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" hideCheckIcon>
            {t('allCategories')}
          </SelectItem>
          {categories.map(category => (
            <SelectItem key={category.category_code} value={category.category_code} hideCheckIcon>
              {getCategoryDisplayName(category)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
