'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { Check, Euro } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type React from 'react'
import { useCallback } from 'react'

export interface InventoryFormData {
  expiryDate: string | null // Nullable for draft batches without expiry dates
  quantity: number
  price: number
  batchNumber?: string
}

export interface InventoryFormProps {
  data: InventoryFormData
  onChange: React.Dispatch<React.SetStateAction<InventoryFormData>>
  onSubmit?: () => void

  // Form state
  disabled?: boolean
  submitDisabled?: boolean

  // Display options
  showExpiryDate?: boolean
  showQuantity?: boolean
  showPrice?: boolean
  showBatchNumber?: boolean
  showSubmitButton?: boolean

  // Labels and text
  title?: string
  submitButtonText?: string
  expiryDateLabel?: string
  quantityLabel?: string
  priceLabel?: string
  batchNumberLabel?: string

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
  showBatchNumber = true,
  showSubmitButton = true,
  title,
  submitButtonText,
  expiryDateLabel,
  quantityLabel,
  priceLabel,
  batchNumberLabel,
  mode = 'edit',
  className = '',
}: InventoryFormProps) {
  const t = useTranslations('inventoryForm')

  // Use translations as defaults if not provided
  const finalTitle = title || t('titles.productDetails')
  const finalSubmitButtonText = submitButtonText || t('buttons.confirm')
  const finalExpiryDateLabel = expiryDateLabel || t('labels.expiryDate')
  const finalQuantityLabel = quantityLabel || t('labels.quantity')
  const finalPriceLabel = priceLabel || t('labels.pricePerUnit')
  const finalBatchNumberLabel =
    batchNumberLabel || t('labels.batchNumber', { defaultValue: 'Batch/Lot Number' })

  // Handle field changes without data dependency to prevent re-render loops
  const handleChange = useCallback(
    (field: keyof InventoryFormData) => (value: string | number | null) => {
      // Use functional update pattern to avoid data dependency
      onChange(prev => ({
        ...prev,
        [field]: value,
      }))
    },
    [onChange],
  )

  // Allow submission without expiry date (creates draft batch)
  const canSubmit = data.quantity > 0 && data.price > 0

  if (mode === 'confirm') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="flex items-center gap-2">
              <Check className="w-6 h-6 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
              <Typography variant="h3" className="text-primary-800 font-black">
                {t('titles.detailsCaptured')}
              </Typography>
            </div>
            <Typography variant="h3" className="text-primary-800 font-black">
              {t('titles.reviewAndSubmit')}
            </Typography>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {showExpiryDate && (
              <div>
                <Label className="text-xs">
                  {finalExpiryDateLabel} {t('labels.editableNote')}{' '}
                  <span className="text-gray-500">
                    ({t('labels.optional', { defaultValue: 'Optional' })})
                  </span>
                </Label>
                <Input
                  type="date"
                  value={data.expiryDate || ''}
                  onChange={e => handleChange('expiryDate')(e.target.value || '')}
                  className="text-sm"
                  disabled={disabled}
                />
              </div>
            )}
            {showQuantity && (
              <div>
                <Label className="text-xs">{finalQuantityLabel}</Label>
                <Input
                  min="0"
                  type="number"
                  value={data.quantity || ''}
                  onChange={e => handleChange('quantity')(parseInt(e.target.value, 10) || 0)}
                  className="text-sm"
                  disabled={disabled}
                />
              </div>
            )}
          </div>

          {showPrice && (
            <div className="mt-3">
              <Label className="text-xs">{finalPriceLabel}</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  min="0"
                  type="number"
                  step="0.01"
                  value={data.price || ''}
                  onChange={e => handleChange('price')(parseFloat(e.target.value) || 0)}
                  className="pl-10 text-sm"
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {showBatchNumber && (
            <div className="mt-3">
              <Label className="text-xs">{finalBatchNumberLabel}</Label>
              <Input
                type="text"
                value={data.batchNumber || ''}
                onChange={e => handleChange('batchNumber')(e.target.value)}
                className="text-sm font-mono"
                placeholder="L12345, LOT ABC123..."
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <Label className="">{finalTitle}</Label>

        <div className="grid grid-cols-2 gap-2">
          {showExpiryDate && (
            <div>
              <Label htmlFor="expiry" className="text-xs">
                {finalExpiryDateLabel}{' '}
                <span className="text-gray-500">
                  ({t('labels.optional', { defaultValue: 'Optional' })})
                </span>
              </Label>
              <Input
                id="expiry"
                type="date"
                value={data.expiryDate || ''}
                onChange={e => handleChange('expiryDate')(e.target.value || '')}
                disabled={disabled}
              />
            </div>
          )}
          {showQuantity && (
            <div>
              <Label htmlFor="quantity" className="text-xs">
                {finalQuantityLabel}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={data.quantity || ''}
                onChange={e => handleChange('quantity')(parseInt(e.target.value, 10) || 0)}
                min="0"
                disabled={disabled}
              />
            </div>
          )}
        </div>

        {showPrice && (
          <div>
            <Label htmlFor="price" className="text-xs">
              {finalPriceLabel}
            </Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={data.price || ''}
                onChange={e => handleChange('price')(parseFloat(e.target.value) || 0)}
                className="pl-10"
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {showBatchNumber && (
          <div>
            <Label htmlFor="batchNumber" className="text-xs">
              {finalBatchNumberLabel}
            </Label>
            <Input
              id="batchNumber"
              type="text"
              value={data.batchNumber || ''}
              onChange={e => handleChange('batchNumber')(e.target.value)}
              className="font-mono"
              placeholder="L12345, LOT ABC123..."
              disabled={disabled}
            />
          </div>
        )}

        {showSubmitButton && onSubmit && (
          <div className="flex gap-2">
            <Button
              onClick={onSubmit}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={!canSubmit || submitDisabled || disabled}
            >
              {finalSubmitButtonText}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
