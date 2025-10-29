import type { Product } from '@/lib/queries/products'
import { useTranslations, useLocale } from 'next-intl'

/**
 * Custom hook for translating product categories using i18n
 * Provides a clean interface for getting localized category names
 */
export function useCategoryTranslation() {
  const t = useTranslations()
  const locale = useLocale()

  const getCategoryName = (product: Product) => {
    if (!product.category_code) {
      // Locale-aware fallback when no category_code
      switch (locale) {
        case 'fr':
          return product.category_display_name_fr || product.category_display_name || ''
        case 'nl':
          return product.category_display_name_nl || product.category_display_name || ''
        default:
          return product.category_display_name || ''
      }
    }

    try {
      const i18nKey = `productCategories.${product.category_code}`
      const translation = t(i18nKey)

      // If translation exists and is not the key itself, use it
      if (translation && translation !== i18nKey && translation.length > 0) {
        return translation
      }
    } catch (error) {
      // Only warn in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Translation error for category:', product.category_code, error)
      }
    }

    // Locale-aware fallback to database fields
    switch (locale) {
      case 'fr':
        return product.category_display_name_fr || product.category_display_name || ''
      case 'nl':
        return product.category_display_name_nl || product.category_display_name || ''
      default:
        return product.category_display_name || ''
    }
  }

  return { getCategoryName }
}
