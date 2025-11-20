'use client'

import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { PRICE_CONSTRAINTS } from '@/lib/constants/file-upload'
import { cn } from '@/lib/utils'

export interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
  Cost_Price: number
  Selling_Price: number
  [key: string]: string | number
}

export interface BatchValidationTableProps {
  items: CsvPreviewItem[]
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onUpdateItem: (index: number, field: keyof CsvPreviewItem, value: string | number) => void
  disabled?: boolean
  itemsPerPage?: number
}

export function BatchValidationTable({
  items,
  currentPage,
  totalPages,
  onPageChange,
  onUpdateItem,
  disabled = false,
  itemsPerPage = 10,
}: BatchValidationTableProps) {
  const t = useTranslations('csvUpload')

  // Calculate pagination
  const startIndex = currentPage * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, items.length)
  const currentItems = items.slice(startIndex, endIndex)

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1)
    }
  }

  // Helper function to convert category codes to human-readable labels
  const getCategoryLabel = (categoryCode: string): string => {
    if (!categoryCode) return ''
    // Convert snake_case to Title Case
    // e.g., "fresh_meat" -> "Fresh Meat", "bakery_fresh" -> "Bakery Fresh"
    return categoryCode
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Typography variant="h3">{t('preview.title')}</Typography>
          <span className="text-sm text-gray-600">
            ({startIndex + 1}-{endIndex} of {items.length} items)
          </span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 0 || disabled}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500 min-w-[60px] text-center">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1 || disabled}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 p-2 text-left">{t('preview.table.sku')}</th>
              <th className="border border-gray-200 p-2 text-left">
                {t('preview.table.productName')}
              </th>
              <th className="border border-gray-200 p-2 text-left">
                {t('preview.table.category')}
              </th>
              <th className="border border-gray-200 p-2 text-left">
                {t('preview.table.quantity')}
              </th>
              <th className="border border-gray-200 p-2 text-left">
                {t('preview.table.costPrice')}
              </th>
              <th className="border border-gray-200 p-2 text-left">
                {t('preview.table.sellingPrice')}
              </th>
              <th className="border border-gray-200 p-2 text-left">
                {t('preview.table.expiryDate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => {
              const actualIndex = startIndex + index
              return (
                <tr key={actualIndex} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-2">
                    <Input
                      value={item.SKU}
                      onChange={e => onUpdateItem(actualIndex, 'SKU', e.target.value)}
                      className="font-mono text-xs h-7 min-w-[100px]"
                      maxLength={100}
                      disabled={disabled}
                    />
                  </td>
                  <td className="border border-gray-200 p-2">
                    <Input
                      value={item.Product_Name}
                      onChange={e => onUpdateItem(actualIndex, 'Product_Name', e.target.value)}
                      className="text-sm h-7 min-w-[150px]"
                      maxLength={255}
                      disabled={disabled}
                    />
                  </td>
                  <td className="border border-gray-200 p-2">
                    <div className="text-xs font-medium text-gray-700">
                      {getCategoryLabel(item.Category)}
                    </div>
                  </td>
                  <td className="border border-gray-200 p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateItem(actualIndex, 'Quantity', item.Quantity - 1)}
                        disabled={item.Quantity <= 1 || disabled}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="min-w-[30px] text-center font-mono text-sm">
                        {item.Quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateItem(actualIndex, 'Quantity', item.Quantity + 1)}
                        disabled={disabled}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="border border-gray-200 p-2">
                    <Input
                      type="number"
                      value={item.Cost_Price.toFixed(2)}
                      onChange={e =>
                        onUpdateItem(
                          actualIndex,
                          'Cost_Price',
                          parseFloat(e.target.value) || PRICE_CONSTRAINTS.MIN_PRICE,
                        )
                      }
                      className={cn(
                        'font-mono text-xs h-7 min-w-[80px]',
                        item.Cost_Price < PRICE_CONSTRAINTS.MIN_PRICE &&
                          'border-red-500 focus:border-red-500',
                      )}
                      min={PRICE_CONSTRAINTS.MIN_PRICE}
                      max={PRICE_CONSTRAINTS.MAX_PRICE}
                      step="0.01"
                      disabled={disabled}
                    />
                  </td>
                  <td className="border border-gray-200 p-2">
                    <Input
                      type="number"
                      value={item.Selling_Price.toFixed(2)}
                      onChange={e =>
                        onUpdateItem(
                          actualIndex,
                          'Selling_Price',
                          parseFloat(e.target.value) || PRICE_CONSTRAINTS.MIN_PRICE,
                        )
                      }
                      className={cn(
                        'font-mono text-xs h-7 min-w-[80px]',
                        item.Selling_Price < PRICE_CONSTRAINTS.MIN_PRICE &&
                          'border-red-500 focus:border-red-500',
                      )}
                      min={PRICE_CONSTRAINTS.MIN_PRICE}
                      max={PRICE_CONSTRAINTS.MAX_PRICE}
                      step="0.01"
                      disabled={disabled}
                    />
                  </td>
                  <td className="border border-gray-200 p-2">
                    {item.Expiry_Date ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={item.Expiry_Date}
                          onChange={e => onUpdateItem(actualIndex, 'Expiry_Date', e.target.value)}
                          className="text-xs h-7 min-w-[120px]"
                          min={new Date().toISOString().split('T')[0]}
                          disabled={disabled}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value=""
                          onChange={e => onUpdateItem(actualIndex, 'Expiry_Date', e.target.value)}
                          placeholder={t('preview.selectDate')}
                          className="text-xs h-7 min-w-[120px]"
                          min={new Date().toISOString().split('T')[0]}
                          disabled={disabled}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {currentItems.map((item, index) => {
          const actualIndex = startIndex + index
          return (
            <div key={actualIndex} className="border border-gray-200 rounded-2xl p-3 bg-white">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={item.SKU}
                    onChange={e => onUpdateItem(actualIndex, 'SKU', e.target.value)}
                    className="font-mono text-xs h-7 flex-1"
                    placeholder="SKU"
                    maxLength={100}
                    disabled={disabled}
                  />
                </div>
                <Input
                  value={item.Product_Name}
                  onChange={e => onUpdateItem(actualIndex, 'Product_Name', e.target.value)}
                  className="font-medium text-sm h-8"
                  placeholder="Product Name"
                  maxLength={255}
                  disabled={disabled}
                />
                <div className="text-xs font-medium text-gray-700 bg-gray-50 p-2 rounded-lg">
                  Category: {getCategoryLabel(item.Category)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('preview.quantityLabel')}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateItem(actualIndex, 'Quantity', item.Quantity - 1)}
                      disabled={item.Quantity <= 1 || disabled}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="min-w-[30px] text-center font-mono text-sm">
                      {item.Quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateItem(actualIndex, 'Quantity', item.Quantity + 1)}
                      disabled={disabled}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      {t('preview.table.costPrice')}
                    </label>
                    <Input
                      type="number"
                      value={item.Cost_Price.toFixed(2)}
                      onChange={e =>
                        onUpdateItem(
                          actualIndex,
                          'Cost_Price',
                          parseFloat(e.target.value) || PRICE_CONSTRAINTS.MIN_PRICE,
                        )
                      }
                      className={cn(
                        'text-sm h-8',
                        item.Cost_Price < PRICE_CONSTRAINTS.MIN_PRICE &&
                          'border-red-500 focus:border-red-500',
                      )}
                      min={PRICE_CONSTRAINTS.MIN_PRICE}
                      max={PRICE_CONSTRAINTS.MAX_PRICE}
                      step="0.01"
                      disabled={disabled}
                    />
                    {item.Cost_Price < PRICE_CONSTRAINTS.MIN_PRICE && (
                      <span className="text-xs text-red-600">
                        {t('csvUpload.errors.priceTooLow')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      {t('preview.table.sellingPrice')}
                    </label>
                    <Input
                      type="number"
                      value={item.Selling_Price.toFixed(2)}
                      onChange={e =>
                        onUpdateItem(
                          actualIndex,
                          'Selling_Price',
                          parseFloat(e.target.value) || PRICE_CONSTRAINTS.MIN_PRICE,
                        )
                      }
                      className={cn(
                        'text-sm h-8',
                        item.Selling_Price < PRICE_CONSTRAINTS.MIN_PRICE &&
                          'border-red-500 focus:border-red-500',
                      )}
                      min={PRICE_CONSTRAINTS.MIN_PRICE}
                      max={PRICE_CONSTRAINTS.MAX_PRICE}
                      step="0.01"
                      disabled={disabled}
                    />
                    {item.Selling_Price < PRICE_CONSTRAINTS.MIN_PRICE && (
                      <span className="text-xs text-red-600">
                        {t('csvUpload.errors.priceTooLow')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    {t('preview.table.expiryDate')}
                  </label>
                  {item.Expiry_Date ? (
                    <Input
                      type="date"
                      value={item.Expiry_Date}
                      onChange={e => onUpdateItem(actualIndex, 'Expiry_Date', e.target.value)}
                      className="text-sm h-8"
                      min={new Date().toISOString().split('T')[0]}
                      disabled={disabled}
                    />
                  ) : (
                    <Input
                      type="date"
                      value=""
                      onChange={e => onUpdateItem(actualIndex, 'Expiry_Date', e.target.value)}
                      placeholder={t('preview.selectDate')}
                      className="text-sm h-8"
                      min={new Date().toISOString().split('T')[0]}
                      disabled={disabled}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
