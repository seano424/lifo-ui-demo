'use client'

import { ArrowUp, Edit3, Euro, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'

export interface ScannedItem {
  id: string
  barcode: string
  productName: string
  brand?: string
  expiryDate: string
  quantity: number
  price: number
  timestamp: Date
}

export interface ScannedItemsListProps {
  items: ScannedItem[]
  onEditItem?: (item: ScannedItem) => void
  onItemUpdated?: (updatedItem: ScannedItem) => void
  onDeleteItem?: (itemId: string) => void
  title?: string
  className?: string
}

export default function ScannedItemsList({
  items,
  onEditItem,
  onItemUpdated,
  onDeleteItem,
  title,
  className = '',
}: ScannedItemsListProps) {
  const t = useTranslations('scannedItemsList')

  // Use translation as default if no title provided
  const finalTitle = title || t('title')
  const [isEditingItem, setIsEditingItem] = useState(false)
  const [editingItem, setEditingItem] = useState<ScannedItem | null>(null)
  const [editForm, setEditForm] = useState({
    expiryDate: '',
    quantity: 1,
    price: 0,
    productName: '',
    brand: '',
    barcode: '',
  })
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false)

  const formatPrice = (price: number) => `€${price.toFixed(2)}`

  // Helper function to format date consistently
  const formatExpiryDate = (dateString: string) => {
    // Ensure we treat the date as local time to avoid timezone shifts
    const date = new Date(`${dateString}T00:00:00`)
    return date.toLocaleDateString()
  }

  const handleEditItem = (item: ScannedItem) => {
    setEditingItem(item)
    setEditForm({
      expiryDate: item.expiryDate,
      quantity: item.quantity,
      price: item.price,
      productName: item.productName,
      brand: item.brand || '',
      barcode: item.barcode,
    })
    setShowAdvancedEdit(false)
    setIsEditingItem(true)
  }

  const handleSaveEdit = () => {
    if (!editingItem) return

    const updatedItem: ScannedItem = {
      ...editingItem,
      expiryDate: editForm.expiryDate,
      quantity: editForm.quantity,
      price: editForm.price,
      productName: editForm.productName,
      brand: editForm.brand || undefined,
      barcode: editForm.barcode,
    }

    onItemUpdated?.(updatedItem)
    setIsEditingItem(false)
    setEditingItem(null)
    setShowAdvancedEdit(false)
  }

  const handleCancelEdit = () => {
    setIsEditingItem(false)
    setEditingItem(null)
    setShowAdvancedEdit(false)
    setEditForm({
      expiryDate: '',
      quantity: 1,
      price: 0,
      productName: '',
      brand: '',
      barcode: '',
    })
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Typography variant="p">{finalTitle}</Typography>
        <div className="text-sm font-medium text-gray-500 bg-gray-100 p-2 w-10 h-10 flex items-center justify-center rounded-full">
          {items.length > 99 ? '99+' : items.length}
        </div>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-start justify-between p-3 border rounded-2xl text-sm"
          >
            <div className="flex-1 flex flex-col gap-2">
              <Typography variant="p">
                <span className="text-gray-500">{item.productName}</span>
              </Typography>
              <div className="flex flex-col gap-2">
                <Typography variant="p">
                  <span className="text-gray-500">{t('itemLabels.quantity')}</span> {item.quantity}
                </Typography>
                <Typography variant="p">
                  <span className="text-gray-500">{t('itemLabels.price')}</span>{' '}
                  {formatPrice(item.price)}
                </Typography>
                <Typography variant="p">
                  <span className="text-gray-500">{t('itemLabels.expiry')}</span>{' '}
                  {formatExpiryDate(item.expiryDate)}
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {(onEditItem || onItemUpdated) && (
                <Button
                  onClick={() => (onEditItem ? onEditItem(item) : handleEditItem(item))}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              )}
              {onDeleteItem && (
                <Button
                  onClick={() => onDeleteItem(item.id)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Item Dialog */}
      {isEditingItem && editingItem && (
        <Dialog open={isEditingItem} onOpenChange={setIsEditingItem}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('editDialog.title')}</DialogTitle>
              <DialogDescription>
                {showAdvancedEdit
                  ? t('editDialog.descriptions.fullEdit')
                  : t('editDialog.descriptions.quickEdit')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Product Info - Now editable in advanced mode */}
              {!showAdvancedEdit ? (
                <div className="p-3 bg-gray-50 rounded-2xl">
                  <div className="text-sm font-medium">{editingItem?.productName}</div>
                  {editingItem?.brand && (
                    <div className="text-xs text-gray-600">{editingItem.brand}</div>
                  )}
                  <div className="text-xs text-gray-500 font-mono">{editingItem?.barcode}</div>
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">
                    {t('editDialog.sections.productDetails')}
                  </div>

                  <div>
                    <Label htmlFor="edit-product-name" className="text-sm font-medium">
                      {t('editDialog.formLabels.productName')}
                    </Label>
                    <Input
                      id="edit-product-name"
                      type="text"
                      value={editForm.productName}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          productName: e.target.value,
                        }))
                      }
                      className="mt-1"
                      placeholder={t('editDialog.placeholders.productName')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-brand" className="text-sm font-medium">
                        {t('editDialog.formLabels.brand')}
                      </Label>
                      <Input
                        id="edit-brand"
                        type="text"
                        value={editForm.brand}
                        onChange={e =>
                          setEditForm(prev => ({
                            ...prev,
                            brand: e.target.value,
                          }))
                        }
                        className="mt-1"
                        placeholder={t('editDialog.placeholders.brand')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-barcode" className="text-sm font-medium">
                        {t('editDialog.formLabels.barcode')}
                      </Label>
                      <Input
                        id="edit-barcode"
                        type="text"
                        value={editForm.barcode}
                        onChange={e =>
                          setEditForm(prev => ({
                            ...prev,
                            barcode: e.target.value,
                          }))
                        }
                        className="mt-1 font-mono text-sm"
                        placeholder={t('editDialog.placeholders.barcode')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Edit Form - Always visible */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    {showAdvancedEdit
                      ? t('editDialog.sections.inventoryDetails')
                      : t('editDialog.sections.quickEdit')}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedEdit(!showAdvancedEdit)}
                    className="text-xs h-7 px-2"
                  >
                    {showAdvancedEdit ? (
                      <>
                        <ArrowUp className="w-3 h-3 mr-1" />
                        {t('editDialog.buttons.hideDetails')}
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3 mr-1" />
                        {t('editDialog.buttons.editDetails')}
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  <Label htmlFor="edit-expiry" className="text-sm font-medium">
                    {t('editDialog.formLabels.expiryDate')}
                  </Label>
                  <Input
                    id="edit-expiry"
                    type="date"
                    value={editForm.expiryDate}
                    onChange={e =>
                      setEditForm(prev => ({
                        ...prev,
                        expiryDate: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-quantity" className="text-sm font-medium">
                      {t('editDialog.formLabels.quantity')}
                    </Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      min="0"
                      value={editForm.quantity}
                      onChange={e =>
                        setEditForm(prev => ({
                          ...prev,
                          quantity: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-price" className="text-sm font-medium">
                      {t('editDialog.formLabels.price')}
                    </Label>
                    <div className="relative mt-1">
                      <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="edit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price}
                        onChange={e =>
                          setEditForm(prev => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleCancelEdit}>
                {t('editDialog.buttons.cancel')}
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveEdit}
                disabled={
                  !editForm.expiryDate ||
                  editForm.quantity <= 0 ||
                  editForm.price <= 0 ||
                  !editForm.productName.trim() ||
                  !editForm.barcode.trim()
                }
              >
                {t('editDialog.buttons.saveChanges')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
