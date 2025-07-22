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
import { useStoreSettings, useStoreActions, useStorePermissions } from '@/hooks/use-store-settings'
import { Edit, Check, X, AlertCircle, Store, MapPin, Phone, Globe, Building } from 'lucide-react'

// Validation schema matching your database structure
const storeInfoSchema = z.object({
  store_name: z.string().min(1, 'Store name is required').max(100, 'Store name too long'),
  business_name: z.string().max(100, 'Business name too long').optional().nullable(),
  store_code: z.string().min(1, 'Store code is required').max(20, 'Store code too long'),
  store_type: z
    .enum(['supermarket', 'convenience', 'restaurant', 'bakery', 'butcher', 'organic'])
    .optional()
    .nullable(),
  size_category: z.enum(['small', 'medium', 'large', 'hypermarket']).optional().nullable(),
  address: z.string().max(255, 'Address too long').optional().nullable(),
  city: z.string().max(100, 'City name too long').optional().nullable(),
  postal_code: z.string().max(20, 'Postal code too long').optional().nullable(),
  country: z.string().max(100, 'Country name too long').optional().nullable(),
  phone: z.string().max(20, 'Phone number too long').optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  website_url: z.string().url('Invalid website URL').optional().nullable().or(z.literal('')),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  default_markup_percent: z.number().min(0).max(100).optional().nullable(),
  waste_reduction_target_percent: z.number().min(0).max(100).optional().nullable(),
})

type StoreInfoFormData = z.infer<typeof storeInfoSchema>

// Configuration constants
const STORE_TYPES = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'convenience', label: 'Convenience Store' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'butcher', label: 'Butcher Shop' },
  { value: 'organic', label: 'Organic Store' },
] as const

const SIZE_CATEGORIES = [
  { value: 'small', label: 'Small (< 500 sqm)' },
  { value: 'medium', label: 'Medium (500-1500 sqm)' },
  { value: 'large', label: 'Large (1500-5000 sqm)' },
  { value: 'hypermarket', label: 'Hypermarket (> 5000 sqm)' },
] as const

const COUNTRIES = [
  { value: 'France', label: 'France' },
  { value: 'Netherlands', label: 'Netherlands' },
  { value: 'Belgium', label: 'Belgium' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Spain', label: 'Spain' },
  { value: 'Italy', label: 'Italy' },
] as const

export default function StoreInformation() {
  const t = useTranslations('settings')
  const { data: storeData, isLoading } = useStoreSettings()
  const { updateBasicInfo, isUpdating } = useStoreActions()
  const { canViewSettings, canEditAdvancedSettings } = useStorePermissions()

  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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

  // Permission check
  if (!canViewSettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You don't have permission to view store settings.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Loading state
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h2" className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Information
            </Typography>
            <Typography variant="p" color="muted">
              Manage your store's basic information and settings
            </Typography>
          </div>
          {!isEditing && canEditAdvancedSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Store
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-4 border-t">
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Store Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <Typography variant="h3">Store Details</Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="store_name">Store Name</Label>
                {isEditing ? (
                  <Input
                    id="store_name"
                    {...form.register('store_name')}
                    placeholder="Enter store name"
                  />
                ) : (
                  <Typography variant="p">{storeData?.store_name || 'Not set'}</Typography>
                )}
                {form.formState.errors.store_name && (
                  <Typography variant="small" className="text-destructive">
                    {form.formState.errors.store_name.message}
                  </Typography>
                )}
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                {isEditing ? (
                  <Input
                    id="business_name"
                    {...form.register('business_name')}
                    placeholder="Enter business name"
                  />
                ) : (
                  <Typography variant="p">{storeData?.business_name || 'Not set'}</Typography>
                )}
              </div>

              {/* Store Code */}
              <div className="space-y-2">
                <Label htmlFor="store_code">Store Code</Label>
                {isEditing ? (
                  <Input
                    id="store_code"
                    {...form.register('store_code')}
                    placeholder="Enter store code"
                    className="font-mono"
                  />
                ) : (
                  <Typography variant="p" className="font-mono">
                    {storeData?.store_code || 'Not set'}
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
                <Label htmlFor="store_type">Store Type</Label>
                {isEditing ? (
                  <Select
                    value={form.watch('store_type') || ''}
                    onValueChange={value =>
                      form.setValue('store_type', value as any, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select store type" />
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
                    {STORE_TYPES.find(t => t.value === storeData?.store_type)?.label || 'Not set'}
                  </Typography>
                )}
              </div>

              {/* Size Category */}
              <div className="space-y-2">
                <Label htmlFor="size_category">Size Category</Label>
                {isEditing ? (
                  <Select
                    value={form.watch('size_category') || ''}
                    onValueChange={value =>
                      form.setValue('size_category', value as any, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size category" />
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
                      'Not set'}
                  </Typography>
                )}
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <Typography variant="h3">Address Information</Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Street Address */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Street Address</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    {...form.register('address')}
                    placeholder="Enter street address"
                  />
                ) : (
                  <Typography variant="p">{storeData?.address || 'Not set'}</Typography>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                {isEditing ? (
                  <Input id="city" {...form.register('city')} placeholder="Enter city" />
                ) : (
                  <Typography variant="p">{storeData?.city || 'Not set'}</Typography>
                )}
              </div>

              {/* Postal Code */}
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                {isEditing ? (
                  <Input
                    id="postal_code"
                    {...form.register('postal_code')}
                    placeholder="Enter postal code"
                  />
                ) : (
                  <Typography variant="p">{storeData?.postal_code || 'Not set'}</Typography>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                {isEditing ? (
                  <Select
                    value={form.watch('country') || ''}
                    onValueChange={value => form.setValue('country', value, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
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
                  <Typography variant="p">{storeData?.country || 'Not set'}</Typography>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <Typography variant="h3">Contact Information</Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input id="phone" {...form.register('phone')} placeholder="Enter phone number" />
                ) : (
                  <Typography variant="p">{storeData?.phone || 'Not set'}</Typography>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder="Enter email address"
                  />
                ) : (
                  <Typography variant="p">{storeData?.email || 'Not set'}</Typography>
                )}
                {form.formState.errors.email && (
                  <Typography variant="small" className="text-destructive">
                    {form.formState.errors.email.message}
                  </Typography>
                )}
              </div>

              {/* Website */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                {isEditing ? (
                  <Input
                    id="website_url"
                    {...form.register('website_url')}
                    placeholder="https://example.com"
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
                      'Not set'
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
            <Typography variant="h3">Store Description</Typography>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Describe your store..."
                  rows={3}
                />
              ) : (
                <Typography variant="p">
                  {storeData?.description || 'No description provided'}
                </Typography>
              )}
              {form.formState.errors.description && (
                <Typography variant="small" className="text-destructive">
                  {form.formState.errors.description.message}
                </Typography>
              )}
            </div>
          </div>

          {/* Business Settings */}
          <div className="space-y-4">
            <Typography variant="h3">Business Settings</Typography>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default Markup */}
              <div className="space-y-2">
                <Label htmlFor="default_markup_percent">Default Markup (%)</Label>
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
                      : 'Not set'}
                  </Typography>
                )}
              </div>

              {/* Waste Reduction Target */}
              <div className="space-y-2">
                <Label htmlFor="waste_reduction_target_percent">Waste Reduction Target (%)</Label>
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
                      : 'Not set'}
                  </Typography>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                type="submit"
                disabled={isUpdating || !hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              {hasUnsavedChanges && (
                <Typography variant="small" className="text-muted-foreground ml-2">
                  You have unsaved changes
                </Typography>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
