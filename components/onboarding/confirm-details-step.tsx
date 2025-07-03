// components/onboarding/confirm-details-step.tsx

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle, Phone } from 'lucide-react'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { useBusinessCheck } from '@/hooks/use-business-check'
import { STORE_TYPE_LABELS, convertFormDataToStoreInsert } from '@/lib/schemas/store-schemas'

export function ConfirmDetailsStep() {
  const {
    selectedStoreForm,
    businessCheckResult,
    isCheckingBusiness,
    setConfirmedStoreInsert,
    setCurrentStep,
    setBusinessCheckResult,
    setIsCheckingBusiness,
  } = useOnboardingStore()

  const { checkBusiness } = useBusinessCheck()
  const [hasCheckedBusiness, setHasCheckedBusiness] = useState(false)

  const handleCheckBusiness = async () => {
    if (!selectedStoreForm) return

    setIsCheckingBusiness(true)
    setHasCheckedBusiness(true)

    try {
      const result = await checkBusiness({
        name: selectedStoreForm.store_name,
        address: selectedStoreForm.address || '',
        city: selectedStoreForm.city || '',
        postalCode: selectedStoreForm.postal_code || '',
        country: selectedStoreForm.country || '',
      })

      if (result) {
        setBusinessCheckResult(result)
      }
    } catch (error) {
      console.error('Error checking business:', error)
      setBusinessCheckResult({
        exists: false,
        message: 'Unable to verify business. You can proceed with registration.',
      })
    } finally {
      setIsCheckingBusiness(false)
    }
  }

  const handleConfirm = () => {
    if (selectedStoreForm) {
      // Generate a temporary store code for the insert
      const tempStoreCode = `${selectedStoreForm.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

      // Convert form data to store insert format
      const storeInsert = convertFormDataToStoreInsert(selectedStoreForm, tempStoreCode)

      setConfirmedStoreInsert(storeInsert)
      setCurrentStep(4)
    }
  }

  const handleBack = () => {
    setCurrentStep(2)
  }

  const handleEdit = () => {
    setCurrentStep(2)
  }

  const handleContactSupport = () => {
    window.open('mailto:support@lifo.ai?subject=Business Already Registered', '_blank')
  }

  if (!selectedStoreForm) {
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

  const canProceed = hasCheckedBusiness && (!businessCheckResult?.exists || false)

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Typography variant="h1">Review Your Store Details</Typography>
        <Typography variant="p" color="muted">
          We&#39;ll verify this business isn&#39;t already registered before creating your account
        </Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{selectedStoreForm.store_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div>
                {selectedStoreForm.store_type
                  ? STORE_TYPE_LABELS[
                      selectedStoreForm.store_type as keyof typeof STORE_TYPE_LABELS
                    ] || selectedStoreForm.store_type
                  : 'Not specified'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Address</div>
              <div>{selectedStoreForm.address || 'Not provided'}</div>
              {selectedStoreForm.city && selectedStoreForm.postal_code && (
                <div className="text-sm text-muted-foreground">
                  {selectedStoreForm.city}, {selectedStoreForm.postal_code}
                </div>
              )}
            </div>

            {selectedStoreForm.phone && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Phone</div>
                <div>{selectedStoreForm.phone}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-muted-foreground">Country</div>
              <div>{selectedStoreForm.country || 'Not specified'}</div>
            </div>

            {selectedStoreForm.business_name &&
              selectedStoreForm.business_name !== selectedStoreForm.store_name && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Business Name</div>
                  <div>{selectedStoreForm.business_name}</div>
                </div>
              )}
          </div>

          {/* Business Check Section */}
          <div className="pt-4 border-t">
            {!hasCheckedBusiness && (
              <div className="space-y-3">
                <Typography variant="p" color="muted">
                  Before creating your account, we need to verify this business isn&#39;t already
                  registered.
                </Typography>
                <Button
                  onClick={handleCheckBusiness}
                  disabled={isCheckingBusiness}
                  className="w-full"
                >
                  {isCheckingBusiness ? 'Checking...' : 'Verify Business'}
                </Button>
              </div>
            )}

            {hasCheckedBusiness && businessCheckResult && (
              <div className="space-y-3">
                {businessCheckResult.exists ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>
                          <strong>This business is already registered.</strong>
                        </p>
                        <p>
                          The store you selected already has an account. Log in or contact us for
                          help.
                        </p>

                        {businessCheckResult.storeData && (
                          <div className="text-xs bg-destructive/10 p-2 rounded mt-2">
                            <p>
                              <strong>Existing Store:</strong>&#39;{' '}
                              {businessCheckResult.storeData.store_name}
                            </p>
                            <p>
                              <strong>Address:</strong> {businessCheckResult.storeData.address}
                            </p>
                            <p>
                              <strong>City:</strong> {businessCheckResult.storeData.city}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleContactSupport}
                            className="flex items-center gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            Contact Support
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                            Try Different Store
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Business verified!</strong> This store is not yet registered. You can
                      proceed with creating your account.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleBack} className="w-full">
              Back
            </Button>
            <Button variant="outline" onClick={handleEdit} className="w-full">
              Edit
            </Button>
            <Button onClick={handleConfirm} className="w-full" disabled={!canProceed}>
              {hasCheckedBusiness ? 'Create Account' : 'Verify First'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
