'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useErrorBoundary } from '@/components/ui/error-boundary'
import { ConfirmNavigation } from '@/components/ui/form-navigation'
import { StepHeader } from '@/components/ui/step-header'
import { Typography } from '@/components/ui/typography'
import { useBusinessCheck } from '@/hooks/use-business-check'
import { convertFormDataToStoreInsert, STORE_TYPE_LABELS } from '@/lib/schemas/store-schemas'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { generateTempStoreCode } from '@/lib/utils/form-helpers'
import { AlertTriangle, CheckCircle, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function ConfirmDetailsStep() {
  const t = useTranslations('onboarding.confirmDetails')

  const {
    selectedStoreForm,
    businessCheckResult,
    isCheckingBusiness,
    setConfirmedStoreInsert,
    reset,
    setBusinessCheckResult,
    setIsCheckingBusiness,
    goToNextStep,
    goToPreviousStep,
  } = useOnboardingStore()

  const { checkBusiness } = useBusinessCheck()
  const [hasCheckedBusiness, setHasCheckedBusiness] = useState(false)
  const { captureError: handleError } = useErrorBoundary()

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
      // For critical errors, use error boundary
      if (error instanceof TypeError || error instanceof ReferenceError) {
        handleError(error as Error)
        return
      }

      // For network/API errors, show graceful fallback
      setBusinessCheckResult({
        exists: false,
        message: 'Unable to verify business. You can proceed with registration.',
      })
    } finally {
      setIsCheckingBusiness(false)
    }
  }

  const handleConfirm = () => {
    if (selectedStoreForm?.store_type) {
      const tempStoreCode = generateTempStoreCode(selectedStoreForm.store_name)
      const storeInsert = convertFormDataToStoreInsert(
        {
          ...selectedStoreForm,
          store_type: selectedStoreForm.store_type as Exclude<
            typeof selectedStoreForm.store_type,
            null
          >,
        },
        tempStoreCode,
      )
      setConfirmedStoreInsert(storeInsert)
      goToNextStep()
    }
  }

  const handleBack = () => {
    goToPreviousStep()
  }

  const handleEdit = () => {
    goToPreviousStep()
  }

  const handleContactSupport = () => {
    window.open('mailto:support@lifo-app?subject=Business Already Registered', '_blank')
  }

  if (!selectedStoreForm) {
    return (
      <div className="text-center">
        <Typography variant="p" color="muted">
          {t('errors.noStoreInfo')}
        </Typography>
        <Button onClick={() => reset()} className="mt-4">
          {t('errors.startOver')}
        </Button>
      </div>
    )
  }

  const canProceed = hasCheckedBusiness && (!businessCheckResult?.exists || false)

  return (
    <div className="mx-auto space-y-6">
      <StepHeader title={t('title')} subtitle={t('subtitle')} />

      <Card>
        <CardHeader>
          <CardTitle>{selectedStoreForm.store_name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-sm  text-muted-foreground">{t('fields.type')}</div>
              <div>
                {selectedStoreForm.store_type
                  ? STORE_TYPE_LABELS[
                      selectedStoreForm.store_type as keyof typeof STORE_TYPE_LABELS
                    ] || selectedStoreForm.store_type
                  : t('values.notSpecified')}
              </div>
            </div>

            <div>
              <div className="text-sm  text-muted-foreground">{t('fields.address')}</div>
              <div>{selectedStoreForm.address || t('values.notProvided')}</div>
              {selectedStoreForm.city && selectedStoreForm.postal_code && (
                <div className="text-sm text-muted-foreground">
                  {selectedStoreForm.city}, {selectedStoreForm.postal_code}
                </div>
              )}
            </div>

            {selectedStoreForm.phone && (
              <div>
                <div className="text-sm  text-muted-foreground">{t('fields.phone')}</div>
                <div>{selectedStoreForm.phone}</div>
              </div>
            )}

            <div>
              <div className="text-sm  text-muted-foreground">{t('fields.country')}</div>
              <div>{selectedStoreForm.country || t('values.notSpecified')}</div>
            </div>

            {selectedStoreForm.business_name &&
              selectedStoreForm.business_name !== selectedStoreForm.store_name && (
                <div>
                  <div className="text-sm  text-muted-foreground">{t('fields.businessName')}</div>
                  <div>{selectedStoreForm.business_name}</div>
                </div>
              )}
          </div>

          {/* Business Check Section */}
          <div className="pt-4 border-t">
            {!hasCheckedBusiness && (
              <div className="flex flex-col gap-4">
                <Typography variant="p" color="muted">
                  {t('businessCheck.verifyPrompt')}
                </Typography>
                <Button
                  onClick={handleCheckBusiness}
                  disabled={isCheckingBusiness}
                  className="w-full mt-4"
                >
                  {isCheckingBusiness
                    ? t('businessCheck.checking')
                    : t('businessCheck.verifyButton')}
                </Button>
              </div>
            )}

            {hasCheckedBusiness && businessCheckResult && (
              <div className="flex flex-col gap-4">
                {businessCheckResult.exists ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex flex-col gap-2">
                        <p>
                          <strong>{t('businessCheck.alreadyRegistered')}</strong>
                        </p>
                        <p>{t('businessCheck.alreadyRegisteredDesc')}</p>

                        {businessCheckResult.storeData && (
                          <div className="text-xs bg-destructive/10 p-2 rounded-2xl mt-2">
                            <p>
                              <strong>{t('businessCheck.existingStore')}</strong>{' '}
                              {businessCheckResult.storeData.store_name}
                            </p>
                            <p>
                              <strong>{t('fields.address')}:</strong>{' '}
                              {businessCheckResult.storeData.address}
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
                            {t('businessCheck.contactSupport')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => reset()}>
                            {t('businessCheck.tryDifferentStore')}
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{t('businessCheck.businessVerified')}</strong>{' '}
                      {t('businessCheck.businessVerifiedDesc')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <ConfirmNavigation
            onBack={handleBack}
            onEdit={handleEdit}
            onConfirm={handleConfirm}
            isDisabled={!canProceed}
          />
        </CardContent>
      </Card>
    </div>
  )
}
