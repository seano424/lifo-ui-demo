/**
 * Legacy category translations - DEPRECATED
 * Use i18n translations in dashboard-data.json instead
 * This file is kept for backward compatibility only
 */

// This file is deprecated. Use the i18n system with dashboard-data.productCategories instead.
// The translations are now managed in:
// - messages/en/dashboard-data.json
// - messages/fr/dashboard-data.json
// - messages/nl/dashboard-data.json

export type CategoryCode = string

/**
 * @deprecated Use useCategoryTranslation hook instead
 * Legacy function for backward compatibility
 */
export function getLocalizedCategoryName(
  category: {
    category_code: string
    display_name_en: string
    display_name_fr?: string | null
    display_name_nl?: string | null
  },
  locale: string,
): string {
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
