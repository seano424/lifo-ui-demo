/**
 * Utility to check Google Places API configuration
 */

export function isGooglePlacesEnabled(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

  if (!apiKey) return false

  const trimmedKey = apiKey.trim()
  if (trimmedKey === '') return false

  // More robust validation - check for placeholder values
  const placeholderPatterns = [
    'your_api_key_here',
    'placeholder',
    'test',
    'development',
    'example',
    'demo',
    'sample',
    'fake',
    'dummy',
  ]

  const lowerKey = trimmedKey.toLowerCase()
  if (placeholderPatterns.some(pattern => lowerKey.includes(pattern))) {
    return false
  }

  // Google API keys can have different prefixes (AIza for Maps JS, AIza for Places, etc.)
  // and are typically 39 characters long, but can vary slightly
  const isValidLength = trimmedKey.length >= 35 && trimmedKey.length <= 45

  // Google API keys are alphanumeric with some allowed symbols
  const validKeyPattern = /^[A-Za-z0-9_-]+$/

  // Basic format validation - must be reasonable length and contain only valid characters
  return isValidLength && validKeyPattern.test(trimmedKey)
}

export function getGooglePlacesApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
}
