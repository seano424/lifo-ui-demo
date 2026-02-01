'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormFieldWrapper, OptionalFormFieldWrapper } from '@/components/ui/form-field-wrapper'
import { FormNavigation } from '@/components/ui/form-navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StepHeader } from '@/components/ui/step-header'
import { STORE_TYPES, type StoreFormData, storeFormSchema } from '@/lib/schemas/store-schemas'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'

// Type guard for store_type
function isStoreType(value: string | null | undefined): value is StoreFormData['store_type'] {
  if (typeof value !== 'string') return false
  return STORE_TYPES.includes(value as StoreFormData['store_type'])
}

export function StoreTypeStep() {
  const t = useTranslations('onboarding.storeType')
  const tStoreTypes = useTranslations('settings.storeInformation.storeTypes')

  const {
    selectedStoreForm,
    isManualEntry,
    setSelectedStoreForm,
    goToNextStep,
    goToPreviousStep,
    canGoBack,
  } = useOnboardingStore()

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      store_name: selectedStoreForm?.store_name || '',
      address: selectedStoreForm?.address ?? '',
      city: selectedStoreForm?.city ?? '',
      postal_code: selectedStoreForm?.postal_code ?? '',
      country: selectedStoreForm?.country ?? 'France',
      phone: selectedStoreForm?.phone || '',
      store_type: isStoreType(selectedStoreForm?.store_type)
        ? (selectedStoreForm?.store_type as StoreFormData['store_type'])
        : undefined,
      business_name: selectedStoreForm?.business_name || '',
    },
  })

  const onSubmit = (data: StoreFormData) => {
    const storeFormData: StoreFormData = {
      store_name: data.store_name,
      address: data.address,
      city: data.city,
      postal_code: data.postal_code,
      country: data.country || 'France',
      phone: data.phone || '',
      store_type: data.store_type,
      business_name: data.business_name || data.store_name,
      // Preserve any existing coordinates/placeId
      coordinates: selectedStoreForm?.coordinates,
      googlePlaceId: selectedStoreForm?.googlePlaceId,
    }

    setSelectedStoreForm(storeFormData)
    // Navigate to the next step - super clean, no conditionals!
    goToNextStep()
  }

  const handleBack = () => {
    goToPreviousStep()
  }

  return (
    <div className="mx-auto flex flex-col gap-4">
      <StepHeader
        title={isManualEntry ? t('addStoreDetailsTitle') : t('completeStoreInformationTitle')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('storeInformationCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormFieldWrapper
                control={form.control}
                name="store_name"
                label={t('storeNameLabel')}
                placeholder={t('storeNamePlaceholder')}
                required
              />

              <FormField<StoreFormData>
                control={form.control}
                name="store_type"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2">
                    <FormLabel>{t('storeTypeLabel')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={typeof field.value === 'string' ? field.value : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectStoreType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STORE_TYPES.map(storeType => (
                          <SelectItem key={storeType} value={storeType}>
                            {tStoreTypes(storeType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <OptionalFormFieldWrapper
                control={form.control}
                name="business_name"
                label={t('businessNameLabel')}
                placeholder={t('businessNamePlaceholder')}
              />

              <FormFieldWrapper
                control={form.control}
                name="address"
                label={t('addressLabel')}
                placeholder={t('addressPlaceholder')}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <FormFieldWrapper
                  control={form.control}
                  name="city"
                  label={t('cityLabel')}
                  placeholder={t('cityPlaceholder')}
                  required
                />

                <FormFieldWrapper
                  control={form.control}
                  name="postal_code"
                  label={t('postalCodeLabel')}
                  placeholder={t('postalCodePlaceholder')}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormFieldWrapper
                  control={form.control}
                  name="country"
                  label={t('countryLabel')}
                  placeholder={t('countryPlaceholder')}
                  required
                />

                <OptionalFormFieldWrapper
                  control={form.control}
                  name="phone"
                  label={t('phoneLabel')}
                  placeholder={t('phonePlaceholder')}
                  type="tel"
                />
              </div>

              <FormNavigation
                onBack={canGoBack() ? handleBack : undefined}
                onNext={() => {}} // Form submission is handled by onSubmit
                nextLabel={t('continueButton')}
                isSubmitting={form.formState.isSubmitting}
                showBack={canGoBack()}
                nextType="submit"
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
