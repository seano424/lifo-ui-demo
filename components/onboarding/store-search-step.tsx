'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { useDebouncedValue } from '@/hooks/use-debounce-search'
import { useGooglePlaces } from '@/hooks/use-google-places'
import type { PlaceAutocompleteResult } from '@/lib/services/google-places'

type SearchState = 'idle' | 'typing' | 'searching' | 'results' | 'no-results' | 'error'

export function StoreSearchStep() {
  const { searchQuery, setSearchQuery, setSelectedStore, setManualEntry, setCurrentStep } =
    useOnboardingStore()

  const [searchValue, setSearchValue] = useState(searchQuery)
  const [localSearchState, setLocalSearchState] = useState<SearchState>('idle')

  // Google Places integration
  const { searchResults, searchState, isLoading, error, searchPlaces, selectPlace, clearResults } =
    useGooglePlaces()

  // Debounce the search value
  const debouncedSearchValue = useDebouncedValue(searchValue, 300)

  // Update local state when user types
  useEffect(() => {
    if (searchValue.length <= 2) {
      setLocalSearchState('idle')
    } else if (searchValue !== debouncedSearchValue) {
      setLocalSearchState('typing')
    }
  }, [searchValue, debouncedSearchValue])

  // Perform search when debounced value changes
  useEffect(() => {
    if (debouncedSearchValue.length > 2) {
      setLocalSearchState('searching')
      searchPlaces(debouncedSearchValue)
      setSearchQuery(debouncedSearchValue) // Update store
    } else {
      clearResults()
      setLocalSearchState('idle')
    }
  }, [debouncedSearchValue, searchPlaces, clearResults, setSearchQuery])

  // Update local state based on Google Places hook state
  useEffect(() => {
    if (localSearchState === 'searching') {
      if (error || searchState === 'error') {
        setLocalSearchState('error')
      } else if (searchState === 'results') {
        setLocalSearchState(searchResults.length > 0 ? 'results' : 'no-results')
      }
      // Stay in 'searching' state if Google Places is still loading
    }
  }, [searchState, searchResults.length, error, localSearchState])

  const handlePlaceSelect = async (place: PlaceAutocompleteResult) => {
    const storeDetails = await selectPlace(place.place_id)

    if (storeDetails) {
      setSelectedStore(storeDetails)
      setCurrentStep(2)
    }
    // Error handling is done in the hook and displayed via the error state
  }

  const handleManualEntry = () => {
    setManualEntry(true)
    setCurrentStep(2)
  }

  // Determine what to show based on single state
  const showLoading = localSearchState === 'typing' || localSearchState === 'searching'
  const showResults = localSearchState === 'results'
  const showNoResults = localSearchState === 'no-results'
  const showError = localSearchState === 'error'

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Find Your Store</h1>
        <p className="text-muted-foreground">Search for your business or add it manually</p>
      </div>

      <div className="space-y-4 relative">
        <Input
          placeholder="Enter your store name or address..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="w-full"
        />

        {/* Error Alert */}
        {showError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Something went wrong while searching. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading indicator */}
        {showLoading && (
          <div className="text-center text-sm text-muted-foreground">Searching for stores...</div>
        )}

        {/* Search Results */}
        {showResults && (
          <div className="max-h-[300px] overflow-y-auto border shadow-lg divide-y divide-border rounded-lg bg-background">
            {searchResults.map(place => (
              <button
                key={place.place_id}
                className="cursor-pointer hover:bg-accent transition-colors w-full text-left disabled:opacity-50"
                onClick={() => handlePlaceSelect(place)}
                disabled={isLoading}
              >
                <CardContent className="p-4">
                  <div className="font-medium">{place.structured_formatting.main_text}</div>
                  <div className="text-sm text-muted-foreground">
                    {place.structured_formatting.secondary_text || place.description}
                  </div>
                  {/* Show place types as badges (optional) */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {place.types
                      .filter(type =>
                        [
                          'grocery_or_supermarket',
                          'supermarket',
                          'convenience_store',
                          'bakery',
                        ].includes(type),
                      )
                      .map(type => (
                        <span
                          key={type}
                          className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full"
                        >
                          {type.replace(/_/g, ' ')}
                        </span>
                      ))}
                  </div>
                </CardContent>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showNoResults && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No stores found matching &apos;{debouncedSearchValue}&apos;
            </p>
            <p className="text-xs text-muted-foreground">
              Try a different search term or add your store manually
            </p>
          </div>
        )}

        {/* Manual entry button */}
        <div className="text-center">
          <Button variant="outline" onClick={handleManualEntry} disabled={isLoading}>
            Add store details manually
          </Button>
        </div>

        {/* Help text */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Can&apos;t find your store? You can add all details manually in the next step.
          </p>
        </div>
      </div>
    </div>
  )
}
