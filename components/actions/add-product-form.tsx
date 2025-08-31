'use client'

import { Plus, Scan } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/use-categories'

export function AddProductForm() {
  const { getCategoriesForDropdown, isLoading: categoriesLoading } = useCategories()

  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category: '',
    expirationDate: '',
    quantity: '',
    price: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Adding product:', formData)
    // Reset form
    setFormData({
      barcode: '',
      name: '',
      category: '',
      expirationDate: '',
      quantity: '',
      price: '',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Product Batch
        </CardTitle>
        <CardDescription>Add a new product batch with expiration date tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  placeholder="Scan or enter barcode"
                  value={formData.barcode}
                  onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                />
                <Button type="button" variant="outline" size="icon">
                  <Scan className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                placeholder="Enter product name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <SelectItem value="" disabled>
                      Loading categories...
                    </SelectItem>
                  ) : (
                    getCategoriesForDropdown().map(
                      (category: { value: string; label: string; code: string }) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ),
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration Date</Label>
              <Input
                id="expiration"
                type="date"
                value={formData.expirationDate}
                onChange={e => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Enter quantity"
                value={formData.quantity}
                onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="Enter price"
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
            Add Product Batch
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
