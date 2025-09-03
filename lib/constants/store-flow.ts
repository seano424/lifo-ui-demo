/**
 * Constants for the store creation flow
 */

export const STORE_FLOW_STEPS = {
  SEARCH: 1,
  DETAILS: 2,
  SUCCESS: 3,
} as const

export const STORE_FLOW_STEPS_NO_GOOGLE_PLACES = {
  DETAILS: 1,
  SUCCESS: 2,
} as const

export const DEFAULT_STORE_VALUES = {
  COUNTRY: 'France',
  MARKUP_PERCENT: 30,
  WASTE_REDUCTION_TARGET: 25,
} as const
