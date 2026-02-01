'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Typography } from '@/components/ui/typography'
import { STORE_FLOW_STEPS } from '@/lib/constants/store-flow'
import {
  STORE_TYPE_LABELS,
  STORE_TYPES,
  type StoreFormData,
  storeFormSchema,
} from '@/lib/schemas/store-schemas'
import { useAddStoreStore } from '@/lib/stores/add-store-store'
import { coerceToString } from '@/lib/utils/form-utils'
import { isGooglePlacesEnabled } from '@/lib/utils/google-places-config'

// Type guard for store_type
function isStoreType(value: string | null | undefined): value is StoreFormData['store_type'] {
  if (typeof value !== 'string') return false
  return STORE_TYPES.includes(value as StoreFormData['store_type'])
}

interface AddStoreDetailsStepProps {
  onSubmit: (data: StoreFormData) => void
  isSubmitting?: boolean
}

export function AddStoreDetailsStep({ onSubmit, isSubmitting = false }: AddStoreDetailsStepProps) {
  const { selectedStoreForm, isManualEntry, setSelectedStoreForm, setCurrentStep } =
    useAddStoreStore()
  const t = useTranslations('storeSettings.addStoreDetails')

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

  const handleSubmit = (data: StoreFormData) => {
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
    onSubmit(storeFormData)
  }

  const handleBack = () => {
    setCurrentStep(STORE_FLOW_STEPS.SEARCH)
  }

  return (
    <div className="mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Typography variant="h2">
          {isManualEntry ? t('title.manual') : t('title.complete')}
        </Typography>
      </div>

      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField<StoreFormData>
              control={form.control}
              name="store_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labels.storeName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('placeholders.storeName')}
                      {...field}
                      value={coerceToString(field.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<StoreFormData>
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labels.businessName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('placeholders.businessName')}
                      {...field}
                      value={coerceToString(field.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<StoreFormData>
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labels.address')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('placeholders.address')}
                      {...field}
                      value={coerceToString(field.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField<StoreFormData>
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labels.city')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('placeholders.city')}
                        {...field}
                        value={coerceToString(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField<StoreFormData>
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labels.postalCode')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('placeholders.postalCode')}
                        {...field}
                        value={coerceToString(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField<StoreFormData>
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labels.country')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('placeholders.country')}
                        {...field}
                        value={coerceToString(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField<StoreFormData>
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labels.phone')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('placeholders.phone')}
                        {...field}
                        value={coerceToString(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField<StoreFormData>
              control={form.control}
              name="store_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labels.storeType')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={typeof field.value === 'string' ? field.value : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('placeholders.selectStoreType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(STORE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              {isGooglePlacesEnabled() && (
                <Button type="button" variant="outline" onClick={handleBack} className="w-full">
                  {t('buttons.back')}
                </Button>
              )}
              <Button type="submit" className="w-full mx-auto " disabled={isSubmitting}>
                {isSubmitting ? t('buttons.creating') : t('buttons.create')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
