/**
 * Form utility functions for handling common form patterns
 */

/**
 * Safely converts a form field value to string, handling null/undefined cases
 * @param value The form field value
 * @returns A string representation of the value
 */
export function safeStringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  return String(value)
}

/**
 * Safely converts a form field value to number, handling null/undefined cases
 * @param value The form field value
 * @returns A number representation of the value or undefined
 */
export function safeNumberValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

/**
 * Generic type coercion for form fields that can be string or number
 * @param value The form field value
 * @returns A safely coerced string value
 */
export function coerceToString(
  value: string | number | null | undefined | { lat: number; lng: number },
): string {
  return safeStringValue(value)
}

/**
 * Helper to create consistent form field value props
 * @param fieldValue The field value from react-hook-form
 * @returns Props object for input components
 */
export function createFieldValueProps(fieldValue: unknown) {
  return {
    value: safeStringValue(fieldValue),
  }
}
