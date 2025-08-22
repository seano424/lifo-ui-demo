// hooks/use-google-places.ts

import { useCallback, useState } from 'react'
import {
  googlePlacesService,
  type PlaceAutocompleteResult,
  type StoreDetails,
} from '@/lib/services/google-places'

export type PlacesSearchState = 'idle' | 'searching' | 'results' | 'no-results' | 'error'

export interface UseGooglePlacesReturn {
  // State
  searchResults: PlaceAutocompleteResult[]
  searchState: PlacesSearchState
  isLoading: boolean
  error: string | null

  // Actions
  searchPlaces: (query: string) => Promise<void>
  selectPlace: (placeId: string) => Promise<StoreDetails | null>
  clearResults: () => void
}

export function useGooglePlaces(): UseGooglePlacesReturn {
  const [searchResults, setSearchResults] = useState<PlaceAutocompleteResult[]>([])
  const [searchState, setSearchState] = useState<PlacesSearchState>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length <= 2) {
      setSearchState('idle')
      setSearchResults([])
      return
    }

    setIsLoading(true)
    setSearchState('searching')
    setError(null)

    try {
      const results = await googlePlacesService.searchPlaces(query)

      setSearchResults(results)
      setSearchState(results.length > 0 ? 'results' : 'no-results')
    } catch (err) {
      console.error('Error searching places:', err)
      setError('Failed to search for places. Please try again.')
      setSearchState('error')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const selectPlace = useCallback(async (placeId: string): Promise<StoreDetails | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const placeDetails = await googlePlacesService.getPlaceDetails(placeId)

      if (!placeDetails) {
        throw new Error('Place details not found')
      }

      const storeDetails = googlePlacesService.transformToStoreDetails(placeDetails)
      return storeDetails
    } catch (err) {
      console.error('Error getting place details:', err)
      setError('Failed to get place details. Please try again.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setSearchResults([])
    setSearchState('idle')
    setError(null)
  }, [])

  return {
    searchResults,
    searchState,
    isLoading,
    error,
    searchPlaces,
    selectPlace,
    clearResults,
  }
}
