'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent } from '@/components/ui/card'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { useDebouncedValue } from '@/hooks/use-debounce-search'

export function StoreSearchStep() {
  const { searchQuery, setSearchQuery, setSelectedStore, setManualEntry, setCurrentStep } =
    useOnboardingStore()

  const [searchValue, setSearchValue] = useState(searchQuery)
  const [isLoading, setIsLoading] = useState(false)
  const [mockResults, setMockResults] = useState<any[]>([])

  // Debounce the search value
  const debouncedSearchValue = useDebouncedValue(searchValue, 300)

  // Track if we're waiting for debounce (typing state)
  const isTyping = searchValue !== debouncedSearchValue

  // Perform search when debounced value changes
  useEffect(() => {
    if (debouncedSearchValue.length > 2) {
      setIsLoading(true)

      // Mock search (replace with Google Places API later)
      setTimeout(() => {
        setMockResults([
          {
            id: '1',
            name: debouncedSearchValue,
            address: '123 Rue de la Paix, 75001 Paris',
            city: 'Paris',
            postalCode: '75001',
            country: 'France',
          },
          {
            id: '2',
            name: `${debouncedSearchValue} Centre`,
            address: '456 Avenue des Champs, 75008 Paris',
            city: 'Paris',
            postalCode: '75008',
            country: 'France',
          },
          {
            id: '3',
            name: `${debouncedSearchValue} Market`,
            address: '789 Boulevard Saint-Germain, 75007 Paris',
            city: 'Paris',
            postalCode: '75007',
            country: 'France',
          },
          {
            id: '4',
            name: `${debouncedSearchValue} Express`,
            address: '321 Rue de Rivoli, 75004 Paris',
            city: 'Paris',
            postalCode: '75004',
            country: 'France',
          },
          {
            id: '5',
            name: `${debouncedSearchValue} Plus`,
            address: '654 Avenue Montaigne, 75008 Paris',
            city: 'Paris',
            postalCode: '75008',
            country: 'France',
          },
          {
            id: '6',
            name: `${debouncedSearchValue} Super`,
            address: '987 Rue du Faubourg, 75010 Paris',
            city: 'Paris',
            postalCode: '75010',
            country: 'France',
          },
        ])
        setIsLoading(false)
      }, 300)
    } else {
      setMockResults([])
      setIsLoading(false)
    }
  }, [debouncedSearchValue])

  const handlePlaceSelect = (place: any) => {
    const storeDetails = {
      name: place.name,
      address: place.address,
      city: place.city,
      postalCode: place.postalCode,
      country: place.country,
      phone: '',
      type: '',
    }
    setSelectedStore(storeDetails)
    setCurrentStep(2)
  }

  const handleManualEntry = () => {
    setManualEntry(true)
    setCurrentStep(2)
  }

  // Determine what to show based on search state
  const shouldShowResults = mockResults.length > 0 && !isLoading && !isTyping
  const shouldShowLoading = (isLoading || isTyping) && searchValue.length > 2
  const shouldShowNoResults =
    searchValue.length > 2 && !isLoading && !isTyping && mockResults.length === 0

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

        {/* Show loading indicator while typing or searching */}
        {shouldShowLoading && (
          <div className="text-center text-sm text-muted-foreground">Searching...</div>
        )}

        {/* Show results */}
        {shouldShowResults && (
          <div className="max-h-[300px] overflow-y-auto border shadow-lg divide-y divide-border rounded-lg bg-background">
            {mockResults.map(place => (
              <button
                key={place.id}
                className="cursor-pointer hover:bg-accent transition-colors w-full text-left"
                onClick={() => handlePlaceSelect(place)}
              >
                <CardContent className="p-4">
                  <div className="font-medium">{place.name}</div>
                  <div className="text-sm text-muted-foreground">{place.address}</div>
                </CardContent>
              </button>
            ))}
          </div>
        )}

        {/* Show no results message only when search is complete */}
        {shouldShowNoResults && (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">No stores matching your search</p>
          </div>
        )}

        <div className="text-center">
          <Button variant="outline" onClick={handleManualEntry}>
            Add store details manually
          </Button>
        </div>
      </div>
    </div>
  )
}
