/**
 * Utility to check Google Places API configuration
 */

export function isGooglePlacesEnabled(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  return !!(
    (
      apiKey &&
      apiKey.trim() !== '' &&
      !['your_api_key_here', 'placeholder', 'test', 'development'].includes(apiKey.toLowerCase()) &&
      apiKey.startsWith('AIza')
    ) // Google Places API keys always start with AIza
  )
}

export function getGooglePlacesApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
}
