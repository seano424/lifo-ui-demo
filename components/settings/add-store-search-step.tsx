'use client'

import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { useDebouncedValue } from '@/hooks/use-debounce-search'
import { useGooglePlaces } from '@/hooks/use-google-places'
import type { PlaceAutocompleteResult } from '@/lib/services/google-places'
import type { StoreFormData } from '@/lib/stores/add-store-store'
import { useAddStoreStore } from '@/lib/stores/add-store-store'

type SearchState = 'idle' | 'typing' | 'searching' | 'results' | 'no-results' | 'error'

export function AddStoreSearchStep() {
  const t = useTranslations('settings.addStoreSearch')

  const { searchQuery, setSearchQuery, setSelectedStoreForm, setManualEntry, setCurrentStep } =
    useAddStoreStore()

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
      setSearchQuery(debouncedSearchValue)
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
    }
  }, [searchState, searchResults.length, error, localSearchState])

  const handlePlaceSelect = async (place: PlaceAutocompleteResult) => {
    const storeDetails = await selectPlace(place.place_id)

    if (storeDetails) {
      // Convert Google Places data to StoreFormData format
      const storeFormData: StoreFormData = {
        store_name: storeDetails.name || place.structured_formatting.main_text,
        address: storeDetails.address || null,
        city: storeDetails.city || null,
        postal_code: storeDetails.postalCode || null,
        country: storeDetails.country || null,
        store_type: null, // Will be set in the next step
        business_name: storeDetails.name || place.structured_formatting.main_text,
        phone: storeDetails.phone || '',
        coordinates: storeDetails.coordinates,
        googlePlaceId: place.place_id,
      }

      setSelectedStoreForm(storeFormData)
      setCurrentStep(2)
    }
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
      <div className="text-center space-y-2 flex flex-col items-center justify-center">
        <Typography variant="h1">{t('title')}</Typography>
        <Typography variant="p" color="muted">
          {t('subtitle')}
        </Typography>
      </div>

      <div className="space-y-4 relative">
        <Input
          placeholder={t('placeholder')}
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="w-full"
        />

        {/* Error Alert */}
        {showError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || t('searchError')}</AlertDescription>
          </Alert>
        )}

        {/* Loading indicator */}
        {showLoading && (
          <div className="text-center text-sm text-muted-foreground">{t('searchingText')}</div>
        )}

        {/* Search Results */}
        {showResults && (
          <div className="max-h-[300px] overflow-y-auto border shadow-lg divide-y divide-border rounded-2xl bg-background">
            {searchResults.map(place => (
              <button
                type="button"
                key={place.place_id}
                className="cursor-pointer hover:bg-accent transition-colors w-full text-left disabled:opacity-50"
                onClick={() => handlePlaceSelect(place)}
                disabled={isLoading}
              >
                <CardContent className="p-4">
                  <div className="font-bold">{place.structured_formatting.main_text}</div>
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
            <Typography variant="p" color="muted">
              {t('noResultsFound', { query: debouncedSearchValue })}
            </Typography>
            <Typography variant="p" color="muted">
              {t('tryDifferentTerm')}
            </Typography>
          </div>
        )}

        {/* Manual entry button */}
        <div className="text-center">
          <Button variant="outline" onClick={handleManualEntry} disabled={isLoading}>
            {t('addManuallyButton')}
          </Button>
        </div>

        {/* Help text */}
        <div className="text-center">
          <Typography variant="p" color="muted">
            {t('helpText')}
          </Typography>
        </div>
      </div>
    </div>
  )
}
