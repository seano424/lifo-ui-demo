'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { storeDetailsSchema, type StoreDetailsForm } from '@/lib/schemas/store-schemas'
import { Typography } from '@/components/ui/typography'

const STORE_TYPES = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'grocery_store', label: 'Grocery Store' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'butcher', label: 'Butcher' },
  { value: 'delicatessen', label: 'Delicatessen' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'other', label: 'Other' },
] as const

export function StoreTypeStep() {
  const { selectedStore, isManualEntry, setSelectedStore, setCurrentStep } = useOnboardingStore()

  const form = useForm<StoreDetailsForm>({
    resolver: zodResolver(storeDetailsSchema),
    defaultValues: {
      name: selectedStore?.name || '',
      address: selectedStore?.address || '',
      city: selectedStore?.city || '',
      postalCode: selectedStore?.postalCode || '',
      country: selectedStore?.country || 'France',
      phone: selectedStore?.phone || '',
      type: (selectedStore?.type as StoreDetailsForm['type']) || undefined,
    },
  })

  const onSubmit = (data: StoreDetailsForm) => {
    const storeDetails = {
      name: data.name,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone || '',
      type: data.type,
      // Preserve any existing coordinates/placeId
      coordinates: selectedStore?.coordinates,
      googlePlaceId: selectedStore?.googlePlaceId,
    }

    setSelectedStore(storeDetails)
    setCurrentStep(3)
  }

  const handleBack = () => {
    setCurrentStep(1)
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Typography variant="h1">
          {isManualEntry ? 'Add Store Details' : 'Complete Store Information'}
        </Typography>
        <Typography variant="p" color="muted">
          {isManualEntry
            ? 'Enter your store information'
            : 'Select your store type and verify details'}
        </Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Store Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STORE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Rue de la Paix" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="75001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="01 23 45 67 89" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleBack} className="w-full">
                  Back
                </Button>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Validating...' : 'Continue'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
