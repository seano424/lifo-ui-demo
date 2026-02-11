'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useStoreActions, useStorePermissions, useStoreSettings } from '@/hooks/use-store-settings'
import { useCurrentUser } from '@/hooks/use-users'
import { DEFAULT_STORE_VALUES } from '@/lib/constants/store-flow'
import type { UserStorePermissions } from '@/lib/server/permissions'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { reportError } from '@/lib/utils/error-reporting'
import {
  createEmailValidator,
  createPhoneValidator,
  createPostalCodeValidator,
  createStoreNameValidator,
  createWebsiteValidator,
} from '@/lib/utils/validation-utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AddStoreFlow } from './add-store-flow'

interface StoreInformationProps {
  serverPermissions?: UserStorePermissions // Server-computed permissions
  storeId?: string // 🚀 NEW: Optional store ID override from server
}

// Type for translation function
type TranslationFunction = (key: string) => string

// Enhanced validation schema with country-specific validation
const createStoreInfoSchema = (t: TranslationFunction, country?: string | null) =>
  z.object({
    store_name: createStoreNameValidator()
      .refine(val => val.length >= 1, t('storeInformation.validation.storeNameRequired'))
      .refine(val => val.length <= 100, t('storeInformation.validation.storeNameTooLong')),
    business_name: z
      .string()
      .max(100, t('storeInformation.validation.businessNameTooLong'))
      .optional()
      .nullable(),
    store_code: z
      .string()
      .min(1, t('storeInformation.validation.storeCodeRequired'))
      .max(20, t('storeInformation.validation.storeCodeTooLong')),
    store_type: z
      .enum(['supermarket', 'convenience', 'restaurant', 'bakery', 'butcher', 'organic'])
      .optional()
      .nullable(),
    size_category: z.enum(['small', 'medium', 'large', 'hypermarket']).optional().nullable(),
    address: z
      .string()
      .max(255, t('storeInformation.validation.addressTooLong'))
      .optional()
      .nullable(),
    city: z.string().max(100, t('storeInformation.validation.cityTooLong')).optional().nullable(),
    postal_code: country
      ? createPostalCodeValidator(country).optional().nullable().or(z.literal(''))
      : z
          .string()
          .max(20, t('storeInformation.validation.postalCodeTooLong'))
          .optional()
          .nullable(),
    country: z
      .string()
      .max(100, t('storeInformation.validation.countryTooLong'))
      .optional()
      .nullable(),
    phone: country
      ? createPhoneValidator(country).optional().nullable().or(z.literal(''))
      : z.string().max(20, t('storeInformation.validation.phoneTooLong')).optional().nullable(),
    email: createEmailValidator().optional().nullable().or(z.literal('')),
    website_url: createWebsiteValidator().optional().nullable().or(z.literal('')),
    description: z
      .string()
      .max(500, t('storeInformation.validation.descriptionTooLong'))
      .optional()
      .nullable(),
    default_markup_percent: z.number().min(0).max(100).optional().nullable(),
    waste_reduction_target_percent: z.number().min(0).max(100).optional().nullable(),
  })

type StoreInfoFormData = z.infer<ReturnType<typeof createStoreInfoSchema>>

// Configuration constants
const createStoreTypes = (t: TranslationFunction) =>
  [
    {
      value: 'supermarket',
      label: t('storeInformation.storeTypes.supermarket'),
    },
    {
      value: 'convenience',
      label: t('storeInformation.storeTypes.convenience'),
    },
    { value: 'restaurant', label: t('storeInformation.storeTypes.restaurant') },
    { value: 'bakery', label: t('storeInformation.storeTypes.bakery') },
    { value: 'butcher', label: t('storeInformation.storeTypes.butcher') },
    { value: 'organic', label: t('storeInformation.storeTypes.organic') },
  ] as const

const createSizeCategories = (t: TranslationFunction) =>
  [
    { value: 'small', label: t('storeInformation.sizeCategories.small') },
    { value: 'medium', label: t('storeInformation.sizeCategories.medium') },
    { value: 'large', label: t('storeInformation.sizeCategories.large') },
    {
      value: 'hypermarket',
      label: t('storeInformation.sizeCategories.hypermarket'),
    },
  ] as const

const createCountries = (t: TranslationFunction) =>
  [
    { value: 'France', label: t('storeInformation.countries.France') },
    {
      value: 'Netherlands',
      label: t('storeInformation.countries.Netherlands'),
    },
    { value: 'Belgium', label: t('storeInformation.countries.Belgium') },
    { value: 'Germany', label: t('storeInformation.countries.Germany') },
    { value: 'Spain', label: t('storeInformation.countries.Spain') },
    { value: 'Italy', label: t('storeInformation.countries.Italy') },
  ] as const

export default function StoreInformation({
  serverPermissions,
  storeId: propStoreId,
}: StoreInformationProps) {
  const t = useTranslations('settings')

  const contextStoreId = useActiveStoreId()
  const effectiveStoreId = propStoreId || contextStoreId

  const { data: storeData, isLoading, error } = useStoreSettings(effectiveStoreId || undefined)
  const { updateBasicInfo } = useStoreActions()
  const { data: userData } = useCurrentUser()

  const _permissions = useStorePermissions({
    serverPermissions,
    storeId: effectiveStoreId || undefined,
  })

  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [_hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const storeInfoSchema = createStoreInfoSchema(t, storeData?.country)
  const STORE_TYPES = createStoreTypes(t)
  const _SIZE_CATEGORIES = createSizeCategories(t)
  const _COUNTRIES = createCountries(t)

  const form = useForm<StoreInfoFormData>({
    resolver: zodResolver(storeInfoSchema),
    defaultValues: {
      store_name: '',
      business_name: '',
      store_code: '',
      store_type: null,
      size_category: null,
      address: '',
      city: '',
      postal_code: '',
      country: DEFAULT_STORE_VALUES.COUNTRY,
      phone: '',
      email: '',
      website_url: '',
      description: '',
      default_markup_percent: DEFAULT_STORE_VALUES.MARKUP_PERCENT,
      waste_reduction_target_percent: DEFAULT_STORE_VALUES.WASTE_REDUCTION_TARGET,
    },
  })

  // Helper function to reset form with store data and clear unsaved changes
  const resetFormAndState = useCallback(
    (clearUnsavedChanges: boolean = true) => {
      if (!storeData) return

      form.reset({
        store_name: storeData.store_name || '',
        business_name: storeData.business_name || '',
        store_code: storeData.store_code || '',
        store_type: storeData.store_type || null,
        size_category: storeData.size_category || null,
        address: storeData.address || '',
        city: storeData.city || '',
        postal_code: storeData.postal_code || '',
        country: storeData.country || DEFAULT_STORE_VALUES.COUNTRY,
        phone: storeData.phone || '',
        email: storeData.email || '',
        website_url: storeData.website_url || '',
        description: storeData.description || '',
        default_markup_percent:
          storeData.default_markup_percent || DEFAULT_STORE_VALUES.MARKUP_PERCENT,
        waste_reduction_target_percent:
          storeData.waste_reduction_target_percent || DEFAULT_STORE_VALUES.WASTE_REDUCTION_TARGET,
      })

      if (clearUnsavedChanges) {
        setHasUnsavedChanges(false)
      }
    },
    [storeData, form],
  )

  useEffect(() => {
    if (storeData) {
      resetFormAndState()
    }
  }, [storeData, resetFormAndState])

  // Optimize form watching to only track when editing starts
  useEffect(() => {
    if (!isEditing) return

    // Only set hasUnsavedChanges to true once when any field changes
    let hasSetUnsavedChanges = false
    const subscription = form.watch(() => {
      if (!hasSetUnsavedChanges) {
        setHasUnsavedChanges(true)
        hasSetUnsavedChanges = true
      }
    })
    return () => subscription.unsubscribe()
  }, [isEditing, form.watch]) // Removed form from dependencies as it's stable

  const _handleSave = (data: StoreInfoFormData) => {
    try {
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === '' ? null : value]),
      )

      updateBasicInfo(cleanedData)
      setIsEditing(false)
      setHasUnsavedChanges(false)
    } catch (error) {
      // Report error with context
      reportError(error instanceof Error ? error : new Error('Failed to save store information'), {
        context: {
          action: 'updateStoreInfo',
          storeId: effectiveStoreId,
          changedFields: Object.keys(data),
        },
        severity: 'medium',
      })
    }
  }

  const _handleCancel = () => {
    resetFormAndState()
    setIsEditing(false)
  }

  const createSkeletonKeys = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}` }))

  const skeletonCards = createSkeletonKeys(8, 'field')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {skeletonCards.map(skeleton => (
              <div key={skeleton.id} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load store settings: {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!storeData) {
    return (
      <>
        <Card>
          <CardContent className="p-6">
            {userData?.requires_pin && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Store data not found. Please contact your administrator to create a store.
                </AlertDescription>
              </Alert>
            )}
            {!userData?.requires_pin && (
              <div className="flex flex-col items-center gap-2 justify-center">
                <Typography variant="p" className="text-center">
                  You don&apos;t have a store yet.
                </Typography>
                <Button variant="subtleSecondary" onClick={() => setIsAddStoreOpen(true)}>
                  {t('storeInformation.addStore')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <BottomSheet
          isOpen={isAddStoreOpen}
          variant="fullHeight"
          onClose={() => setIsAddStoreOpen(false)}
          title={t('storeInformation.addStore')}
        >
          <AddStoreFlow />
        </BottomSheet>
      </>
    )
  }

  return (
    <>
      {/* HIDDEN: Manage Multiple Stores Section temporarily disabled */}
      {/* <Card className="mb-4">
        <CardHeader className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row items-center justify-between">
            <div className="flex flex-col gap-2">
              <Typography variant="h3" className="flex items-center gap-2">
                {t('storeInformation.manageMultipleStores')}
              </Typography>
              <Typography variant="p" color="muted" className="max-w-md">
                {t('storeInformation.addStoreDescription')}
              </Typography>
            </div>
            <Button
              variant="default"
              onClick={() => setIsAddStoreOpen(true)}
              className="flex items-center gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              {t('storeInformation.addStore')}
            </Button>
          </div>
        </CardHeader>
      </Card> */}

      {/* Store Information Section */}
      <Card className="shadow-primary-300 border-t-0">
        <CardHeader>
          <div className="flex flex-col gap-2 pb-2">
            <Typography variant="h3" className="flex items-center">
              {t('storeInformation.title')}
            </Typography>
            <Typography variant="p" color="muted">
              Information synced from your Square account
            </Typography>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 pt-4 border-t">
          {/* Basic Information from Square */}
          <div className="flex flex-col gap-4">
            <Typography variant="h4">{t('storeInformation.sections.storeDetails')}</Typography>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {/* Store Name - from Square location name */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="store_name">{t('storeInformation.fields.storeName')}</Label>
                <Typography variant="p">
                  {storeData?.store_name || t('storeInformation.messages.notSet')}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  From Square location
                </Typography>
              </div>

              {/* Business Name - from Square merchant */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="business_name">{t('storeInformation.fields.businessName')}</Label>
                <Typography variant="p">
                  {storeData?.business_name || t('storeInformation.messages.notSet')}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  From Square merchant
                </Typography>
              </div>

              {/* Store Code - read-only, generated from Square */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="store_code">{t('storeInformation.fields.storeCode')}</Label>
                <Typography variant="p" className="font-mono">
                  {storeData?.store_code || t('storeInformation.messages.notSet')}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  Auto-generated from Square location ID
                </Typography>
              </div>

              {/* Store Type - defaults to convenience */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="store_type">{t('storeInformation.fields.storeType')}</Label>
                <Typography variant="p">
                  {STORE_TYPES.find(type => type.value === storeData?.store_type)?.label ||
                    'Convenience'}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  Default type for Square stores
                </Typography>
              </div>
            </div>
          </div>

          {/* Location from Square */}
          <div className="flex flex-col gap-4">
            <Typography variant="h4">
              {t('storeInformation.sections.locationInformation')}
            </Typography>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City - from Square location address */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">{t('storeInformation.fields.city')}</Label>
                <Typography variant="p">
                  {storeData?.city || t('storeInformation.messages.notSet')}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  From Square location
                </Typography>
              </div>

              {/* Country - from Square merchant */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="country">{t('storeInformation.fields.country')}</Label>
                <Typography variant="p">
                  {storeData?.country || t('storeInformation.messages.notSet')}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  From Square merchant
                </Typography>
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Store information is automatically synced from your Square account. To update these
              details, please make changes in your Square Dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* HIDDEN: Danger Zone - Store Deactivation temporarily disabled */}
      {/* {permissions.isOwner && storeData && (
        <Card className="border-destructive">
          <CardHeader>
            <Typography variant="h3" color="destructive">
              {t('deactivateStore.dangerZoneTitle')}
            </Typography>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
              <Typography variant="p" color="muted">
                {t('deactivateStore.dangerZoneDescription')}
              </Typography>

              <DeactivateStoreDialog
                store={storeData}
                canDeactivate={permissions.isOwner ?? false}
              />
            </div>
          </CardContent>
        </Card>
      )} */}
      <BottomSheet
        isOpen={isAddStoreOpen}
        variant="fullHeight"
        onClose={() => setIsAddStoreOpen(false)}
        title={t('storeInformation.addStore')}
        className="py-8 px-8 gap-8"
      >
        <AddStoreFlow />
      </BottomSheet>
    </>
  )
}
