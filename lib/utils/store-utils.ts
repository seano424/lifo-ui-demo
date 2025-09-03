/**
 * Store utility functions
 */

/**
 * Generates a unique store code using the store name prefix and UUID
 * @param storeName The name of the store
 * @returns A unique store code
 */
export function generateUniqueStoreCode(storeName: string): string {
  // Create a 3-character prefix from the store name
  const prefix = storeName
    .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X') // Pad with X if less than 3 characters

  // Generate a unique suffix using crypto.randomUUID
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : fallbackUUID()

  // Take first 6 characters of UUID (without hyphens) for the suffix
  const suffix = uuid.replace(/-/g, '').substring(0, 6).toUpperCase()

  return `${prefix}${suffix}`
}

/**
 * Fallback UUID generator for environments without crypto.randomUUID
 */
function fallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
