// components/settings/store-information.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useStoreSettings, useStoreActions } from '@/hooks/use-store-settings'
import { useStorePermissions } from '@/hooks/use-store-permissions' // Updated hook
import {
  Edit,
  Check,
  X,
  AlertCircle,
  Store,
  MapPin,
  Phone,
  Globe,
  Building,
  Shield,
} from 'lucide-react'
import type { UserStorePermissions } from '@/lib/server/permissions'

// Interface for server permissions prop
interface StoreInformationProps {
  serverPermissions?: UserStorePermissions // Server-computed permissions
  storeId?: string // Optional store ID override
}

// Type for translation function
type TranslationFunction = (key: string) => string

// Validation schema matching your database structure
const createStoreInfoSchema = (t: TranslationFunction) =>
  z.object({
    store_name: z
      .string()
      .min(1, t('storeInformation.validation.storeNameRequired'))
      .max(100, t('storeInformation.validation.storeNameTooLong')),
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
    postal_code: z
      .string()
      .max(20, t('storeInformation.validation.postalCodeTooLong'))
      .optional()
      .nullable(),
    country: z
      .string()
      .max(100, t('storeInformation.validation.countryTooLong'))
      .optional()
      .nullable(),
    phone: z.string().max(20, t('storeInformation.validation.phoneTooLong')).optional().nullable(),
    email: z
      .string()
      .email(t('storeInformation.validation.invalidEmail'))
      .optional()
      .nullable()
      .or(z.literal('')),
    website_url: z
      .string()
      .url(t('storeInformation.validation.invalidWebsite'))
      .optional()
      .nullable()
      .or(z.literal('')),
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
    { value: 'supermarket', label: t('storeInformation.storeTypes.supermarket') },
    { value: 'convenience', label: t('storeInformation.storeTypes.convenience') },
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
    { value: 'hypermarket', label: t('storeInformation.sizeCategories.hypermarket') },
  ] as const

const createCountries = (t: TranslationFunction) =>
  [
    { value: 'France', label: t('storeInformation.countries.France') },
    { value: 'Netherlands', label: t('storeInformation.countries.Netherlands') },
    { value: 'Belgium', label: t('storeInformation.countries.Belgium') },
    { value: 'Germany', label: t('storeInformation.countries.Germany') },
    { value: 'Spain', label: t('storeInformation.countries.Spain') },
    { value: 'Italy', label: t('storeInformation.countries.Italy') },
  ] as const

export default function StoreInformation({ serverPermissions, storeId }: StoreInformationProps) {
  const t = useTranslations('settings')
  const { data: storeData, isLoading, error } = useStoreSettings()
  const { updateBasicInfo, isUpdating } = useStoreActions()

  // 🚀 Use hybrid permissions hook with server permissions as fallback
  const permissions = useStorePermissions({ serverPermissions })

  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const storeInfoSchema = createStoreInfoSchema(t)
  const STORE_TYPES = createStoreTypes(t)
  const SIZE_CATEGORIES = createSizeCategories(t)
  const COUNTRIES = createCountries(t)

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
      country: 'France',
      phone: '',
      email: '',
      website_url: '',
      description: '',
      default_markup_percent: 30,
      waste_reduction_target_percent: 25,
    },
  })

  // Update form when store data loads
  useEffect(() => {
    if (storeData) {
      form.reset({
        store_name: storeData.store_name || '',
        business_name: storeData.business_name || '',
        store_code: storeData.store_code || '',
        store_type: storeData.store_type || null,
        size_category: storeData.size_category || null,
        address: storeData.address || '',
        city: storeData.city || '',
        postal_code: storeData.postal_code || '',
        country: storeData.country || 'France',
        phone: storeData.phone || '',
        email: storeData.email || '',
        website_url: storeData.website_url || '',
        description: storeData.description || '',
        default_markup_percent: storeData.default_markup_percent || 30,
        waste_reduction_target_percent: storeData.waste_reduction_target_percent || 25,
      })
      setHasUnsavedChanges(false)
    }
  }, [storeData, form])

  // Watch for form changes
  useEffect(() => {
    if (!isEditing) return

    const subscription = form.watch(() => {
      setHasUnsavedChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [form, isEditing])

  const handleSave = async (data: StoreInfoFormData) => {
    try {
      // Clean up empty strings and convert to null for database
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === '' ? null : value]),
      )

      await updateBasicInfo(cleanedData)
      setIsEditing(false)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save store information:', error)
    }
  }

  const handleCancel = () => {
    if (storeData) {
      form.reset({
        store_name: storeData.store_name || '',
        business_name: storeData.business_name || '',
        store_code: storeData.store_code || '',
        store_type: storeData.store_type || null,
        size_category: storeData.size_category || null,
        address: storeData.address || '',
        city: storeData.city || '',
        postal_code: storeData.postal_code || '',
        country: storeData.country || 'France',
        phone: storeData.phone || '',
        email: storeData.email || '',
        website_url: storeData.website_url || '',
        description: storeData.description || '',
        default_markup_percent: storeData.default_markup_percent || 30,
        waste_reduction_target_percent: storeData.waste_reduction_target_percent || 25,
      })
    }
    setIsEditing(false)
    setHasUnsavedChanges(false)
  }

  // 🚀 NO MORE PERMISSION LOADING STATE - server permissions provide immediate values
  // Only show loading for data fetching, not permissions
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
        <CardContent className="space-y-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error if data fetch failed
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

  // Show error if no store data
  if (!storeData) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Store data not found. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Permission check - no loading state needed since server permissions provide immediate values
  if (!permissions.canViewSettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to view store settings. Contact your store{' '}
              {permissions.isEmployee ? 'manager or owner' : 'owner'}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h2" className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {t('storeInformation.title')}
            </Typography>
            <Typography variant="p" color="muted">
              {t('storeInformation.description')}
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            {/* Permission indicator */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
              <Shield className="h-3 w-3" />
              {permissions.isOwner ? 'Owner' : permissions.isManager ? 'Manager' : 'Employee'}
            </div>

            {/* Edit button - only show if user can edit */}
            {!isEditing && permissions.canEditBasicInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                {t('storeInformation.editStore')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-4 border-t">
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Store Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <Typography variant="h3">{t('storeInformation.sections.storeDetails')}</Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="store_name">{t('storeInformation.fields.storeName')}</Label>
                {isEditing ? (
                  <Input
                    id="store_name"
                    {...form.register('store_name')}
                    placeholder={t('storeInformation.placeholders.storeName')}
                  />
                ) : (
                  <Typography variant="p">
                    {storeData?.store_name || t('storeInformation.messages.notSet')}
                  </Typography>
                )}
                {form.formState.errors.store_name && (
                  <Typography variant="small" className="text-destructive">
                    {form.formState.errors.store_name.message}
                  </Typography>
                )}
              </div>

              {/* Store Code */}
              <div className="space-y-2">
                <Label htmlFor="store_code">{t('storeInformation.fields.storeCode')}</Label>
                {isEditing ? (
                  <Input
                    id="store_code"
                    {...form.register('store_code')}
                    placeholder={t('storeInformation.placeholders.storeCode')}
                    className="font-mono"
                  />
                ) : (
                  <Typography variant="p" className="font-mono">
                    {storeData?.store_code || t('storeInformation.messages.notSet')}
                  </Typography>
                )}
                {form.formState.errors.store_code && (
                  <Typography variant="small" className="text-destructive">
                    {form.formState.errors.store_code.message}
                  </Typography>
                )}
              </div>

              {/* Store Type */}
              <div className="space-y-2">
                <Label htmlFor="store_type">{t('storeInformation.fields.storeType')}</Label>
                {isEditing ? (
                  <Select
                    value={form.watch('store_type') || ''}
                    onValueChange={value =>
                      form.setValue('store_type', value as StoreInfoFormData['store_type'], {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('storeInformation.selectPlaceholders.storeType')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {STORE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Typography variant="p">
                    {STORE_TYPES.find(type => type.value === storeData?.store_type)?.label ||
                      t('storeInformation.messages.notSet')}
                  </Typography>
                )}
              </div>

              {/* Size Category */}
              <div className="space-y-2">
                <Label htmlFor="size_category">{t('storeInformation.fields.sizeCategory')}</Label>
                {isEditing ? (
                  <Select
                    value={form.watch('size_category') || ''}
                    onValueChange={value =>
                      form.setValue('size_category', value as StoreInfoFormData['size_category'], {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('storeInformation.selectPlaceholders.sizeCategory')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_CATEGORIES.map(size => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Typography variant="p">
                    {SIZE_CATEGORIES.find(s => s.value === storeData?.size_category)?.label ||
                      t('storeInformation.messages.notSet')}
                  </Typography>
                )}
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <Typography variant="h3">
                {t('storeInformation.sections.addressInformation')}
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Street Address */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">{t('storeInformation.fields.address')}</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    {...form.register('address')}
                    placeholder={t('storeInformation.placeholders.address')}
                  />
                ) : (
                  <Typography variant="p">
                    {storeData?.address || t('storeInformation.messages.notSet')}
                  </Typography>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">{t('storeInformation.fields.city')}</Label>
                {isEditing ? (
                  <Input
                    id="city"
                    {...form.register('city')}
                    placeholder={t('storeInformation.placeholders.city')}
                  />
                ) : (
                  <Typography variant="p">
                    {storeData?.city || t('storeInformation.messages.notSet')}
                  </Typography>
                )}
              </div>

              {/* Postal Code */}
              <div className="space-y-2">
                <Label htmlFor="postal_code">{t('storeInformation.fields.postalCode')}</Label>
                {isEditing ? (
                  <Input
                    id="postal_code"
                    {...form.register('postal_code')}
                    placeholder={t('storeInformation.placeholders.postalCode')}
                  />
                ) : (
                  <Typography variant="p">
                    {storeData?.postal_code || t('storeInformation.messages.notSet')}
                  </Typography>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">{t('storeInformation.fields.country')}</Label>
                {isEditing ? (
                  <Select
                    value={form.watch('country') || ''}
                    onValueChange={value =>
                      form.setValue('country', value as StoreInfoFormData['country'], {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('storeInformation.selectPlaceholders.country')} />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Typography variant="p">
                    {storeData?.country || t('storeInformation.messages.notSet')}
                  </Typography>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <Typography variant="h3">
                {t('storeInformation.sections.contactInformation')}
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">{t('storeInformation.fields.phone')}</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    {...form.register('phone')}
                    placeholder={t('storeInformation.placeholders.phone')}
                  />
                ) : (
                  <Typography variant="p">
                    {storeData?.phone || t('storeInformation.messages.notSet')}
                  </Typography>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('storeInformation.fields.email')}</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder={t('storeInformation.placeholders.email')}
                  />
                ) : (
                  <Typography variant="p">
                    {storeData?.email || t('storeInformation.messages.notSet')}
                  </Typography>
                )}
                {form.formState.errors.email && (
                  <Typography variant="small" className="text-destructive">
                    {form.formState.errors.email.message}
                  </Typography>
                )}
              </div>

              {/* Website */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="website_url">{t('storeInformation.fields.website')}</Label>
                {isEditing ? (
                  <Input
                    id="website_url"
                    {...form.register('website_url')}
                    placeholder={t('storeInformation.placeholders.website')}
                  />
                ) : (
                  <Typography variant="p">
                    {storeData?.website_url ? (
                      <a
                        href={storeData.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        {storeData.website_url}
                      </a>
                    ) : (
                      t('storeInformation.messages.notSet')
                    )}
                  </Typography>
                )}
                {form.formState.errors.website_url && (
                  <Typography variant="small" className="text-destructive">
                    {form.formState.errors.website_url.message}
                  </Typography>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <Typography variant="h3">{t('storeInformation.sections.storeDescription')}</Typography>

            <div className="space-y-2">
              <Label htmlFor="description">{t('storeInformation.fields.description')}</Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder={t('storeInformation.placeholders.description')}
                  rows={3}
                />
              ) : (
                <Typography variant="p">
                  {storeData?.description || t('storeInformation.messages.noDescription')}
                </Typography>
              )}
              {form.formState.errors.description && (
                <Typography variant="small" className="text-destructive">
                  {form.formState.errors.description.message}
                </Typography>
              )}
            </div>
          </div>

          {/* Business Settings - Only show if user can edit advanced settings */}
          {permissions.canEditAdvancedSettings && (
            <div className="space-y-4">
              <Typography variant="h3">
                {t('storeInformation.sections.businessSettings')}
              </Typography>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Default Markup */}
                <div className="space-y-2">
                  <Label htmlFor="default_markup_percent">
                    {t('storeInformation.fields.defaultMarkup')}
                  </Label>
                  {isEditing ? (
                    <Input
                      id="default_markup_percent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      {...form.register('default_markup_percent', { valueAsNumber: true })}
                    />
                  ) : (
                    <Typography variant="p">
                      {storeData?.default_markup_percent
                        ? `${storeData.default_markup_percent}%`
                        : t('storeInformation.messages.notSet')}
                    </Typography>
                  )}
                </div>

                {/* Waste Reduction Target */}
                <div className="space-y-2">
                  <Label htmlFor="waste_reduction_target_percent">
                    {t('storeInformation.fields.wasteReductionTarget')}
                  </Label>
                  {isEditing ? (
                    <Input
                      id="waste_reduction_target_percent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      {...form.register('waste_reduction_target_percent', { valueAsNumber: true })}
                    />
                  ) : (
                    <Typography variant="p">
                      {storeData?.waste_reduction_target_percent
                        ? `${storeData.waste_reduction_target_percent}%`
                        : t('storeInformation.messages.notSet')}
                    </Typography>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Read-only message for users without edit permissions */}
          {!permissions.canEditBasicInfo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have read-only access to store information. Contact your store{' '}
                {permissions.isEmployee ? 'manager or owner' : 'owner'} to make changes.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {isEditing && permissions.canEditBasicInfo && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                type="submit"
                disabled={isUpdating || !hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {isUpdating
                  ? t('storeInformation.actions.saving')
                  : t('storeInformation.actions.saveChanges')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {t('storeInformation.actions.cancel')}
              </Button>
              {hasUnsavedChanges && (
                <Typography variant="small" className="text-muted-foreground ml-2">
                  {t('storeInformation.actions.unsavedChanges')}
                </Typography>
              )}
            </div>
          )}
        </form>

        {/* Debug Info (Development only) */}
        {process.env.NODE_ENV === 'development' && serverPermissions && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Typography variant="small" className="font-medium text-yellow-800 mb-2">
              Debug: Server Permissions
            </Typography>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
              {JSON.stringify(serverPermissions, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
