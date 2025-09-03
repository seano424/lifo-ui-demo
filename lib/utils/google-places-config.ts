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

  // Google Places API keys always start with AIza and are 39 characters long
  const isValidFormat = trimmedKey.startsWith('AIza') && trimmedKey.length === 39

  // Additional check for only alphanumeric characters and specific symbols
  const validKeyPattern = /^AIza[a-zA-Z0-9_-]+$/

  return isValidFormat && validKeyPattern.test(trimmedKey)
}

export function getGooglePlacesApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
}
