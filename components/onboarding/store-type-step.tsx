'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'

const STORE_TYPES = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'grocery_store', label: 'Grocery Store' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'butcher', label: 'Butcher' },
  { value: 'delicatessen', label: 'Delicatessen' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'other', label: 'Other' },
]

export function StoreTypeStep() {
  const { selectedStore, isManualEntry, setSelectedStore, setCurrentStep } = useOnboardingStore()

  const [formData, setFormData] = useState({
    name: selectedStore?.name || '',
    address: selectedStore?.address || '',
    city: selectedStore?.city || '',
    postalCode: selectedStore?.postalCode || '',
    country: selectedStore?.country || 'France',
    phone: selectedStore?.phone || '',
    type: selectedStore?.type || '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleContinue = () => {
    if (!formData.name || !formData.type || !formData.address) {
      alert('Please fill in all required fields')
      return
    }

    const storeDetails = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      postalCode: formData.postalCode,
      country: formData.country,
      phone: formData.phone,
      type: formData.type,
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
        <h1 className="text-2xl font-bold">
          {isManualEntry ? 'Add Store Details' : 'Complete Store Information'}
        </h1>
        <p className="text-muted-foreground">
          {isManualEntry
            ? 'Enter your store information'
            : 'Select your store type and verify details'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Store Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="Your Store Name"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Store Type *</Label>
            <Select value={formData.type} onValueChange={value => handleInputChange('type', value)}>
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
              placeholder="123 Rue de la Paix"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={e => handleInputChange('city', e.target.value)}
                placeholder="Paris"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={e => handleInputChange('postalCode', e.target.value)}
                placeholder="75001"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={e => handleInputChange('phone', e.target.value)}
              placeholder="01 23 45 67 89"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleBack} className="w-full">
              Back
            </Button>
            <Button onClick={handleContinue} className="w-full">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
