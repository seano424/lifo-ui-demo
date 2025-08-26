'use client'

import { ArrowUp, Edit3, Euro } from 'lucide-react'
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
  title?: string
  className?: string
}

export default function ScannedItemsList({
  items,
  onEditItem,
  onItemUpdated,
  title = 'Total items scanned',
  className = '',
}: ScannedItemsListProps) {
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
        <Typography variant="h3">{title}</Typography>
        <div className="text-sm font-medium text-gray-500 bg-gray-100 p-2 w-10 h-10 flex items-center justify-center rounded-full">
          {items.length > 99 ? '99+' : items.length}
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 border rounded text-sm"
          >
            <div className="flex-1">
              <Typography variant="p">
                <span className="text-gray-500">Product:</span> {item.productName}
              </Typography>
              <Typography variant="p">
                <span className="font-normal text-gray-500">Quantity:</span> {item.quantity}x{' '}
                <span className="font-normal text-gray-500">Price:</span> {formatPrice(item.price)}{' '}
                <span className="font-normal text-gray-500">Expiry:</span>{' '}
                {new Date(item.expiryDate).toLocaleDateString()}
              </Typography>
            </div>

            {(onEditItem || onItemUpdated) && (
              <Button
                onClick={() => onEditItem ? onEditItem(item) : handleEditItem(item)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Edit Item Dialog */}
      {isEditingItem && editingItem && (
        <Dialog open={isEditingItem} onOpenChange={setIsEditingItem}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                {showAdvancedEdit
                  ? 'Edit all product details including name, brand, barcode, and inventory information.'
                  : 'Quick edit expiry date, quantity, and price. Click "Edit Details" for more options.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Product Info - Now editable in advanced mode */}
              {!showAdvancedEdit ? (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium">{editingItem?.productName}</div>
                  {editingItem?.brand && (
                    <div className="text-xs text-gray-600">{editingItem.brand}</div>
                  )}
                  <div className="text-xs text-gray-500 font-mono">{editingItem?.barcode}</div>
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">Product Details</div>

                  <div>
                    <Label htmlFor="edit-product-name" className="text-sm font-medium">
                      Product Name
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
                      placeholder="Enter product name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-brand" className="text-sm font-medium">
                        Brand
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
                        placeholder="Brand name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-barcode" className="text-sm font-medium">
                        Barcode
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
                        placeholder="Barcode number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Edit Form - Always visible */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    {showAdvancedEdit ? 'Inventory Details' : 'Quick Edit'}
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
                        Hide Details
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit Details
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  <Label htmlFor="edit-expiry" className="text-sm font-medium">
                    Expiry Date
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
                      Quantity
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
                      Price (€)
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
                Cancel
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
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
