/**
 * Utility to check Google Places API configuration
 */

export function isGooglePlacesEnabled(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY &&
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY.trim() !== '' &&
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY !== 'your_api_key_here'
  )
}

export function getGooglePlacesApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
}
