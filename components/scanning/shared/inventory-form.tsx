'use client'

import { Check, Euro } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'

export interface InventoryFormData {
  expiryDate: string
  quantity: number
  price: number
}

export interface InventoryFormProps {
  data: InventoryFormData
  onChange: (data: InventoryFormData) => void
  onSubmit?: () => void

  // Form state
  disabled?: boolean
  submitDisabled?: boolean

  // Display options
  showExpiryDate?: boolean
  showQuantity?: boolean
  showPrice?: boolean
  showSubmitButton?: boolean

  // Labels and text
  title?: string
  submitButtonText?: string
  expiryDateLabel?: string
  quantityLabel?: string
  priceLabel?: string

  // Form mode
  mode?: 'edit' | 'confirm'

  className?: string
}

export default function InventoryForm({
  data,
  onChange,
  onSubmit,
  disabled = false,
  submitDisabled = false,
  showExpiryDate = true,
  showQuantity = true,
  showPrice = true,
  showSubmitButton = true,
  title = 'Product Details',
  submitButtonText = 'Confirm',
  expiryDateLabel = 'Expiry Date',
  quantityLabel = 'Quantity',
  priceLabel = 'Price per unit (€)',
  mode = 'edit',
  className = '',
}: InventoryFormProps) {
  const handleChange = (field: keyof InventoryFormData) => (value: string | number) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const canSubmit = data.expiryDate && data.quantity > 0 && data.price > 0

  if (mode === 'confirm') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="flex items-center gap-2">
              <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
              <Typography variant="h3" className="text-primary-800 font-black">
                Details captured successfully
              </Typography>
            </div>
            <Typography variant="h3" className="text-primary-700 font-black">
              Review and submit to inventory
            </Typography>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {showExpiryDate && (
              <div>
                <Label className="text-xs">{expiryDateLabel} (editable)</Label>
                <Input
                  type="date"
                  value={data.expiryDate}
                  onChange={e => handleChange('expiryDate')(e.target.value)}
                  className="text-sm"
                  disabled={disabled}
                />
              </div>
            )}
            {showQuantity && (
              <div>
                <Label className="text-xs">{quantityLabel}</Label>
                <Input
                  type="number"
                  value={data.quantity}
                  onChange={e => handleChange('quantity')(parseInt(e.target.value, 10) || 1)}
                  min="0"
                  className="text-sm"
                  disabled={disabled}
                />
              </div>
            )}
          </div>

          {showPrice && (
            <div className="mt-3">
              <Label className="text-xs">{priceLabel}</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  min="0"
                  type="number"
                  step="0.01"
                  value={data.price}
                  onChange={e => handleChange('price')(parseFloat(e.target.value) || 0)}
                  className="pl-10 text-sm"
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <Label className="font-medium">{title}</Label>

        <div className="grid grid-cols-2 gap-2">
          {showExpiryDate && (
            <div>
              <Label htmlFor="expiry" className="text-xs">
                {expiryDateLabel}
              </Label>
              <Input
                id="expiry"
                type="date"
                value={data.expiryDate}
                onChange={e => handleChange('expiryDate')(e.target.value)}
                disabled={disabled}
              />
            </div>
          )}
          {showQuantity && (
            <div>
              <Label htmlFor="quantity" className="text-xs">
                {quantityLabel}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={data.quantity}
                onChange={e => handleChange('quantity')(parseInt(e.target.value, 10) || 1)}
                min="0"
                disabled={disabled}
              />
            </div>
          )}
        </div>

        {showPrice && (
          <div>
            <Label htmlFor="price" className="text-xs">
              {priceLabel}
            </Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={data.price}
                onChange={e => handleChange('price')(parseFloat(e.target.value) || 0)}
                className="pl-10"
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {showSubmitButton && onSubmit && (
          <div className="flex gap-2">
            <Button
              onClick={onSubmit}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={!canSubmit || submitDisabled || disabled}
            >
              {submitButtonText}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
