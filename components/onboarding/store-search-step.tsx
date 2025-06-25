'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'

// For now, we'll use a simple mock search - replace with Google Places API later
export function StoreSearchStep() {
  const { searchQuery, setSearchQuery, setSelectedStore, setManualEntry, setCurrentStep } =
    useOnboardingStore()

  const [searchValue, setSearchValue] = useState(searchQuery)
  const [isLoading, setIsLoading] = useState(false)
  const [mockResults, setMockResults] = useState<any[]>([])

  // Mock search function (replace with Google Places API later)
  useEffect(() => {
    if (searchValue.length > 2) {
      setIsLoading(true)
      // Simulate API delay
      setTimeout(() => {
        setMockResults([
          {
            id: '1',
            name: searchValue,
            address: '123 Rue de la Paix, 75001 Paris',
            city: 'Paris',
            postalCode: '75001',
            country: 'France',
          },
          {
            id: '2',
            name: `${searchValue} Centre`,
            address: '456 Avenue des Champs, 75008 Paris',
            city: 'Paris',
            postalCode: '75008',
            country: 'France',
          },
        ])
        setIsLoading(false)
      }, 500)
    } else {
      setMockResults([])
    }
  }, [searchValue])

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

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Find Your Store</h1>
        <p className="text-muted-foreground">Search for your business or add it manually</p>
      </div>

      <div className="space-y-4">
        <Input
          placeholder="Enter your store name or address..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="w-full"
        />

        {isLoading && <div className="text-center text-sm text-muted-foreground">Searching...</div>}

        {mockResults.length > 0 && (
          <div className="space-y-2">
            {mockResults.map(place => (
              <Card
                key={place.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handlePlaceSelect(place)}
              >
                <CardContent className="p-4">
                  <div className="font-medium">{place.name}</div>
                  <div className="text-sm text-muted-foreground">{place.address}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {searchValue && mockResults.length === 0 && !isLoading && (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">No stores matching your search</p>
            <Button variant="outline" onClick={handleManualEntry}>
              Add store details manually
            </Button>
          </div>
        )}

        {!searchValue && (
          <div className="text-center">
            <Button variant="outline" onClick={handleManualEntry}>
              Add store details manually
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
