// Pagination constants
export const DEFAULT_PAGE_SIZE = 20
export const LARGE_PAGE_SIZE = 50
export const SMALL_PAGE_SIZE = 12

// Intersection observer constants
export const DEFAULT_ROOT_MARGIN = '100px'
export const CONSERVATIVE_ROOT_MARGIN = '50px'
export const AGGRESSIVE_ROOT_MARGIN = '200px'

// Debounce delays (in milliseconds)
export const SEARCH_DEBOUNCE_DELAY = 300
export const SCROLL_DEBOUNCE_DELAY = 100
export const FILTER_DEBOUNCE_DELAY = 150

// Cache TTL (in milliseconds)
export const ANALYTICS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
export const BATCH_ACTIONS_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// UI constants
export const SKELETON_ITEM_COUNT = 8
export const MAX_VISIBLE_ITEMS_MOBILE = 10
export const MAX_VISIBLE_ITEMS_DESKTOP = 20

// Urgency thresholds (in days)
export const CRITICAL_THRESHOLD = 0 // Today or past due
export const HIGH_THRESHOLD = 1 // Tomorrow
export const MEDIUM_THRESHOLD = 7 // Within a week
// Everything else is LOW priority

// Action effectiveness thresholds (percentages)
export const HIGH_EFFECTIVENESS_THRESHOLD = 70
export const MEDIUM_EFFECTIVENESS_THRESHOLD = 40
// Below 40% is considered low effectiveness
