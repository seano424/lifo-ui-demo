/**
 * Shelf Life Lookup Table
 *
 * Simple keyword-based matching for category names to default shelf life days.
 * Uses case-insensitive partial matching with fallback to 14 days for unmatched food categories.
 */

export interface ShelfLifeDefault {
  /** Suggested shelf life in days */
  days: number | null
  /** Whether we found a match or used fallback */
  matched: boolean
  /** Which keyword matched (for display/debugging) */
  matchedKeyword: string | null
}

/**
 * Lookup table mapping category keywords to shelf life days
 * Includes English, French, and Dutch common food categories
 */
const SHELF_LIFE_LOOKUP: Record<string, number> = {
  // Dairy products (7-14 days)
  dairy: 7,
  milk: 7,
  lait: 7, // French
  melk: 7, // Dutch
  cheese: 14,
  fromage: 14, // French
  kaas: 14, // Dutch
  yogurt: 7,
  yoghurt: 7,
  yaourt: 7, // French
  butter: 21,
  beurre: 21, // French
  boter: 21, // Dutch
  cream: 7,
  crème: 7, // French
  room: 7, // Dutch

  // Bakery (2-5 days)
  bakery: 3,
  boulangerie: 3, // French
  bakkerij: 3, // Dutch
  bread: 3,
  pain: 3, // French
  brood: 3, // Dutch
  pastry: 3,
  pâtisserie: 3, // French
  gebak: 3, // Dutch
  cake: 5,
  gâteau: 5, // French
  taart: 5, // Dutch
  croissant: 2,

  // Produce (3-7 days)
  produce: 5,
  fruit: 5,
  fruits: 5,
  légumes: 5, // French
  groente: 5, // Dutch
  vegetable: 5,
  vegetables: 5,
  légume: 5, // French
  salad: 3,
  salade: 3, // French
  sla: 3, // Dutch
  lettuce: 3,
  laitue: 3, // French
  herbs: 5,
  herbes: 5, // French
  kruiden: 5, // Dutch
  berry: 3,
  berries: 3,
  baies: 3, // French
  bessen: 3, // Dutch

  // Meat & Poultry (2-5 days)
  meat: 5,
  viande: 5, // French
  vlees: 5, // Dutch
  beef: 5,
  boeuf: 5, // French
  rundvlees: 5, // Dutch
  pork: 5,
  porc: 5, // French
  varkensvlees: 5, // Dutch
  chicken: 4,
  poulet: 4, // French
  kip: 4, // Dutch
  poultry: 4,
  volaille: 4, // French
  gevogelte: 4, // Dutch
  turkey: 4,
  dinde: 4, // French
  kalkoen: 4, // Dutch

  // Seafood (1-3 days)
  fish: 3,
  poisson: 3, // French
  vis: 3, // Dutch
  seafood: 3,
  'fruits de mer': 3, // French
  zeevruchten: 3, // Dutch
  salmon: 3,
  saumon: 3, // French
  zalm: 3, // Dutch
  shrimp: 2,
  crevette: 2, // French
  garnaal: 2, // Dutch

  // Deli & Prepared (3-7 days)
  deli: 5,
  charcuterie: 7, // French
  delicatessen: 5, // Dutch
  prepared: 3,
  'plats préparés': 3, // French
  bereide: 3, // Dutch
  ready: 3,
  'prêt à manger': 3, // French
  klaar: 3, // Dutch
  sandwich: 2,
  sandwiches: 2,

  // Long shelf life (30-365 days)
  frozen: 90,
  congelé: 90, // French
  bevroren: 90, // Dutch
  canned: 365,
  conserve: 365, // French
  ingeblikte: 365, // Dutch
  dried: 180,
  séché: 180, // French
  gedroogd: 180, // Dutch
  pantry: 90,
  épicerie: 90, // French
  voorraadkast: 90, // Dutch

  // Beverages (7-30 days)
  beverage: 30,
  boisson: 30, // French
  drank: 30, // Dutch
  juice: 14,
  jus: 14, // French
  sap: 14, // Dutch
  soda: 60,
  water: 180,
  eau: 180, // French

  // Snacks & Packaged (30-90 days)
  snack: 60,
  snacks: 60,
  chip: 60,
  chips: 60,
  cracker: 60,
  crackers: 60,
  cookie: 45,
  cookies: 45,
  biscuit: 45,
  biscuits: 45,

  // Special categories
  organic: 7,
  biologique: 7, // French
  bio: 7, // French/Dutch
  biologisch: 7, // Dutch
  fresh: 5,
  frais: 5, // French
  vers: 5, // Dutch
  local: 7,
  locale: 7, // French
  lokaal: 7, // Dutch
}

/**
 * Default shelf life for unmatched food categories
 */
const DEFAULT_SHELF_LIFE_DAYS = 14

/**
 * Get default shelf life for a category based on keyword matching
 *
 * @param categoryName - The category name to match (case-insensitive)
 * @returns ShelfLifeDefault object with days, matched status, and metadata
 *
 * @example
 * getDefaultShelfLife("Dairy Products") // { days: 7, matched: true, matchedKeyword: "dairy" }
 * getDefaultShelfLife("Fresh Produce") // { days: 5, matched: true, matchedKeyword: "produce" }
 * getDefaultShelfLife("Unknown Food") // { days: 14, matched: false, matchedKeyword: null }
 */
export function getDefaultShelfLife(categoryName: string): ShelfLifeDefault {
  const normalizedName = categoryName.toLowerCase().trim()

  // Try to match against keywords
  for (const [keyword, days] of Object.entries(SHELF_LIFE_LOOKUP)) {
    if (normalizedName.includes(keyword.toLowerCase())) {
      return {
        days,
        matched: true,
        matchedKeyword: keyword,
      }
    }
  }

  // No match found - use fallback
  return {
    days: DEFAULT_SHELF_LIFE_DAYS,
    matched: false,
    matchedKeyword: null,
  }
}

/**
 * Batch process multiple category names
 *
 * @param categoryNames - Array of category names to process
 * @returns Map of category name to ShelfLifeDefault
 */
export function getShelfLifeForCategories(categoryNames: string[]): Map<string, ShelfLifeDefault> {
  const results = new Map<string, ShelfLifeDefault>()

  for (const name of categoryNames) {
    results.set(name, getDefaultShelfLife(name))
  }

  return results
}
