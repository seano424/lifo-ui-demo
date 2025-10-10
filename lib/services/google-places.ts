import { logger } from '@/lib/utils/logger'

export interface PlaceAutocompleteResult {
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text?: string
  }
  description: string
  types: string[]
}

export interface PlaceDetailsResult {
  place_id: string
  name: string
  formatted_address: string
  address_components: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  formatted_phone_number?: string
  website?: string
  business_status?: string
  types: string[]
}

export interface StoreDetails {
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  type: string
  placeId?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

class GooglePlacesService {
  private apiKey: string
  private baseUrl = 'https://maps.googleapis.com/maps/api/place'

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''

    if (!this.apiKey && process.env.NODE_ENV === 'development') {
      logger.warn('GooglePlacesService', 'Google Places API key not found. Using mock data.')
    }
  }

  /**
   * Search for places using the Autocomplete API
   * Documentation: https://developers.google.com/maps/documentation/places/web-service/autocomplete
   */
  async searchPlaces(query: string): Promise<PlaceAutocompleteResult[]> {
    // Always use mock data when no API key is present
    if (!this.apiKey) {
      // Add a small delay to simulate network request for better UX
      await new Promise(resolve => setTimeout(resolve, 200))
      return this.getMockAutocompleteResults(query)
    }

    try {
      const params = new URLSearchParams({
        input: query,
        key: this.apiKey,
        types: 'establishment', // Focus on businesses
        fields: 'place_id,name,formatted_address,types', // Optimize for cost
        // Uncomment to restrict to specific countries
        // components: 'country:nl|country:fr|country:de', // Netherlands, France, Germany
      })

      const response = await fetch(`${this.baseUrl}/autocomplete/json?${params}`)
      const data = await response.json()

      if (data.status !== 'OK') {
        console.error('Google Places Autocomplete error:', data.status, data.error_message)
        return this.getMockAutocompleteResults(query)
      }

      return data.predictions || []
    } catch (error) {
      console.error('Error fetching place suggestions:', error)
      return this.getMockAutocompleteResults(query)
    }
  }

  /**
   * Get detailed information about a specific place
   * Documentation: https://developers.google.com/maps/documentation/places/web-service/details
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
    if (!this.apiKey) {
      return this.getMockPlaceDetails(placeId)
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: this.apiKey,
        // Optimize fields for cost - only request what we need
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'address_components',
          'geometry/location',
          'formatted_phone_number',
          'website',
          'business_status',
          'types',
        ].join(','),
      })

      const response = await fetch(`${this.baseUrl}/details/json?${params}`)
      const data = await response.json()

      if (data.status !== 'OK') {
        console.error('Google Places Details error:', data.status, data.error_message)
        return this.getMockPlaceDetails(placeId)
      }

      return data.result || null
    } catch (error) {
      console.error('Error fetching place details:', error)
      return this.getMockPlaceDetails(placeId)
    }
  }

  /**
   * Transform Google Places result into our StoreDetails format
   */
  transformToStoreDetails(placeDetails: PlaceDetailsResult): StoreDetails {
    const addressComponents = placeDetails.address_components || []

    // Extract address components
    const getComponent = (types: string[]) => {
      const component = addressComponents.find(comp =>
        types.some(type => comp.types.includes(type)),
      )
      return component?.long_name || ''
    }

    const city = getComponent(['locality', 'administrative_area_level_2'])
    const postalCode = getComponent(['postal_code'])
    const country = getComponent(['country'])

    // Determine store type based on Google Places types
    const storeType = this.determineStoreType(placeDetails.types)

    return {
      name: placeDetails.name,
      address: placeDetails.formatted_address,
      city,
      postalCode,
      country,
      phone: placeDetails.formatted_phone_number || '',
      type: storeType,
      placeId: placeDetails.place_id,
      coordinates: {
        lat: placeDetails.geometry.location.lat,
        lng: placeDetails.geometry.location.lng,
      },
    }
  }

  /**
   * Determine store type from Google Places types
   */
  private determineStoreType(types: string[]): string {
    // Map Google types to our enum values
    const typeMapping: Record<string, string> = {
      supermarket: 'supermarket',
      grocery_or_supermarket: 'grocery_store',
      bakery: 'bakery',
      butcher_shop: 'butcher',
      delicatessen: 'delicatessen',
      restaurant: 'restaurant',
      cafe: 'cafe',
    }

    for (const [googleType, enumValue] of Object.entries(typeMapping)) {
      if (types.includes(googleType)) {
        return enumValue
      }
    }

    return 'other' // Default fallback
  }

  /**
   * Mock data for development/fallback
   */
  private getMockAutocompleteResults(query: string): PlaceAutocompleteResult[] {
    return [
      {
        place_id: `mock_${query}_1`,
        structured_formatting: {
          main_text: query,
          secondary_text: '123 Rue de la Paix, Paris',
        },
        description: `${query}, 123 Rue de la Paix, 75001 Paris, France`,
        types: ['establishment', 'supermarket'],
      },
      {
        place_id: `mock_${query}_2`,
        structured_formatting: {
          main_text: `${query} Centre`,
          secondary_text: '456 Avenue des Champs, Paris',
        },
        description: `${query} Centre, 456 Avenue des Champs, 75008 Paris, France`,
        types: ['establishment', 'supermarket'],
      },
      {
        place_id: `mock_${query}_3`,
        structured_formatting: {
          main_text: `${query} Market`,
          secondary_text: '789 Boulevard Saint-Germain, Paris',
        },
        description: `${query} Market, 789 Boulevard Saint-Germain, 75007 Paris, France`,
        types: ['establishment', 'convenience_store'],
      },
    ]
  }

  private getMockPlaceDetails(placeId: string): PlaceDetailsResult {
    const baseName = placeId.replace('mock_', '').split('_')[0]

    return {
      place_id: placeId,
      name: baseName,
      formatted_address: '123 Rue de la Paix, 75001 Paris, France',
      address_components: [
        { long_name: '123', short_name: '123', types: ['street_number'] },
        { long_name: 'Rue de la Paix', short_name: 'Rue de la Paix', types: ['route'] },
        { long_name: 'Paris', short_name: 'Paris', types: ['locality'] },
        { long_name: '75001', short_name: '75001', types: ['postal_code'] },
        { long_name: 'France', short_name: 'FR', types: ['country'] },
      ],
      geometry: {
        location: { lat: 48.8566, lng: 2.3522 },
      },
      formatted_phone_number: '+33 1 42 86 87 88',
      website: `https://${baseName.toLowerCase()}.com`,
      business_status: 'OPERATIONAL',
      types: ['establishment', 'supermarket', 'food', 'store'],
    }
  }
}

// Export singleton instance
export const googlePlacesService = new GooglePlacesService()
