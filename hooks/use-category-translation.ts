import type { Product } from '@/lib/queries/products'
import { useTranslations } from 'next-intl'

/**
 * Custom hook for translating product categories using i18n
 * Provides a clean interface for getting localized category names
 */
export function useCategoryTranslation() {
  const t = useTranslations()

  const getCategoryName = (product: Product) => {
    if (!product.category_code) {
      return product.category_display_name || ''
    }

    try {
      const i18nKey = `productCategories.${product.category_code}`
      const translation = t(i18nKey)

      // Debug logging
      console.log('Category translation debug:', {
        category_code: product.category_code,
        i18nKey,
        translation,
        isKeySame: translation === i18nKey,
        translationLength: translation?.length,
        productData: {
          category_display_name: product.category_display_name,
          category_display_name_fr: product.category_display_name_fr,
        },
      })

      // If translation exists and is not the key itself, use it
      if (translation && translation !== i18nKey && translation.length > 0) {
        return translation
      }
    } catch (error) {
      console.warn('Translation error for category:', product.category_code, error)
    }

    // Fallback to database field based on locale
    return product.category_display_name_fr || product.category_display_name || ''
  }

  return { getCategoryName }
}
