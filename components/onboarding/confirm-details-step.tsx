'use client'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'

const STORE_TYPE_LABELS: Record<string, string> = {
  supermarket: 'Supermarket',
  grocery_store: 'Grocery Store',
  bakery: 'Bakery',
  butcher: 'Butcher',
  delicatessen: 'Delicatessen',
  restaurant: 'Restaurant',
  cafe: 'Café',
  other: 'Other',
}

export function ConfirmDetailsStep() {
  const { selectedStore, setConfirmedStore, setCurrentStep } = useOnboardingStore()

  const handleConfirm = () => {
    if (selectedStore) {
      setConfirmedStore(selectedStore)
      setCurrentStep(4)
    }
  }

  const handleBack = () => {
    setCurrentStep(2)
  }

  const handleEdit = () => {
    setCurrentStep(2)
  }

  if (!selectedStore) {
    return (
      <div className="text-center">
        <Typography variant="p" color="muted">
          No store information found. Please go back and complete the previous steps.
        </Typography>
        <Button onClick={() => setCurrentStep(1)} className="mt-4">
          Start Over
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Typography variant="h1">Review Your Store Details</Typography>
        <Typography variant="p" color="muted">
          Please review your store information before creating your account
        </Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{selectedStore.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div>{STORE_TYPE_LABELS[selectedStore.type] || selectedStore.type}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Address</div>
              <div>{selectedStore.address}</div>
              {selectedStore.city && selectedStore.postalCode && (
                <div className="text-sm text-muted-foreground">
                  {selectedStore.city}, {selectedStore.postalCode}
                </div>
              )}
            </div>

            {selectedStore.phone && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Phone</div>
                <div>{selectedStore.phone}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-muted-foreground">Country</div>
              <div>{selectedStore.country}</div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleBack} className="w-full">
              Back
            </Button>
            <Button variant="outline" onClick={handleEdit} className="w-full">
              Edit
            </Button>
            <Button onClick={handleConfirm} className="w-full">
              Confirm
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
