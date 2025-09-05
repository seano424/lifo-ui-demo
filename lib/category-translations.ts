/**
 * Category translations for languages not supported in the database
 * Maps category codes to translated display names
 */

// Common food category translations
export const categoryTranslations = {
  nl: {
    // Basic food categories
    dry_goods: 'Droge waren',
    dairy: 'Zuivel',
    meat: 'Vlees',
    fruits: 'Fruit',
    vegetables: 'Groenten',
    bakery: 'Bakkerij',
    frozen: 'Diepvries',
    beverages: 'Dranken',
    snacks: 'Snacks',
    condiments: 'Kruiden en sauzen',
    canned: 'Conserven',
    seafood: 'Zeevruchten',
    poultry: 'Gevogelte',
    spices: 'Kruiden',
    oils: 'Oliën',
    grains: 'Granen',
    legumes: 'Peulvruchten',
    herbs: 'Kruiden',
    nuts: 'Noten',
    sweets: 'Snoep',
    alcohol: 'Alcohol',
    tea_coffee: 'Thee en koffie',
    breakfast: 'Ontbijt',
    lunch: 'Lunch',
    dinner: 'Diner',
    desserts: 'Nagerechten',
    baby_food: 'Babyvoeding',
    organic: 'Biologisch',
    gluten_free: 'Glutenvrij',
    vegan: 'Veganistisch',
    vegetarian: 'Vegetarisch',
  },
} as const

export type SupportedLanguage = keyof typeof categoryTranslations
export type CategoryCode = keyof typeof categoryTranslations.nl

/**
 * Get localized category display name
 * Falls back to database fields, then translation mapping, then English
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
  // Use database field if available
  switch (locale) {
    case 'fr':
      return category.display_name_fr || category.display_name_en

    case 'nl': {
      // Try database field first (future-ready)
      if (category.display_name_nl) {
        return category.display_name_nl
      }
      // Try translation mapping
      const nlTranslation = categoryTranslations.nl[category.category_code as CategoryCode]
      if (nlTranslation) {
        return nlTranslation
      }
      // Fall back to English
      return category.display_name_en
    }

    default:
      return category.display_name_en
  }
}
