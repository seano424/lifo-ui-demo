/**
 * Form utility functions to simplify type handling and reduce duplication
 */

import type { Control, FieldPath, FieldValues } from 'react-hook-form'

/**
 * Safely convert form field value to string for input components
 */
export function safeFieldValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  return ''
}

/**
 * Common form field props for text inputs
 */
export interface FormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder: string
  required?: boolean
  disabled?: boolean
}

/**
 * Extract magic numbers as constants
 */
export const FORM_CONSTANTS = {
  MIN_HEIGHT: 500,
  PROGRESS_STEP_MULTIPLIER: 100,
  TEMP_STORE_CODE_LENGTH: 3,
  TEMP_STORE_CODE_SUFFIX_LENGTH: 6,
} as const

/**
 * Generate a temporary store code
 */
export function generateTempStoreCode(storeName: string): string {
  const prefix = storeName.substring(0, FORM_CONSTANTS.TEMP_STORE_CODE_LENGTH).toUpperCase()
  const suffix = Date.now().toString().slice(-FORM_CONSTANTS.TEMP_STORE_CODE_SUFFIX_LENGTH)
  return `${prefix}${suffix}`
}
