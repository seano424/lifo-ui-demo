'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { AutomationRule } from '@/lib/queries/dashboard'

type RuleType = 'category' | 'product'

interface CategoryOption {
  key: string
  name: string
  count: number
  products: string[]
}

interface ProductOption {
  key: string
  name: string
  category: string
}

const MOCK_AVAILABLE_CATEGORIES: CategoryOption[] = [
  { key: 'beverages', name: 'Beverages', count: 1, products: ['Orange Juice 1L'] },
  { key: 'butter', name: 'Butter & Spreads', count: 0, products: [] },
  { key: 'cheese', name: 'Cheese', count: 0, products: [] },
  { key: 'chilled', name: 'Chilled Packaged', count: 0, products: [] },
  {
    key: 'deli',
    name: 'Deli & Prepared Foods',
    count: 15,
    products: ['Roast Chicken', 'Pasta Salad 500g', 'Ham Slices 200g', 'Potato Salad 400g'],
  },
]

const MOCK_CATEGORIES_WITH_RULES: CategoryOption[] = [
  {
    key: 'dairy',
    name: 'Dairy',
    count: 12,
    products: ['Whole Milk 1L', 'Greek Yogurt 500g', 'Cheddar Cheese 200g', 'Butter Unsalted 250g'],
  },
  {
    key: 'canned',
    name: 'Canned Goods',
    count: 8,
    products: ['Tomato Soup 400g', 'Black Beans 400g', 'Tuna 185g', 'Corn Kernels 340g'],
  },
]

const MOCK_AVAILABLE_PRODUCTS: ProductOption[] = [
  { key: 'whole-milk', name: 'Whole Milk 1L', category: 'Dairy' },
  { key: 'greek-yogurt', name: 'Greek Yogurt 500g', category: 'Dairy' },
  { key: 'orange-juice', name: 'Orange Juice 1L', category: 'Beverages' },
  { key: 'tomato-soup', name: 'Tomato Soup 400g', category: 'Canned Goods' },
]

const MOCK_PRODUCTS_WITH_RULES: ProductOption[] = [
  { key: 'bread', name: 'Fresh Bread 400g', category: 'Bakery' },
]

interface AddAutomationRulePanelProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (rule: Omit<AutomationRule, 'rule_id' | 'created_at'>) => void
}

export function AddAutomationRulePanel({ isOpen, onClose, onCreate }: AddAutomationRulePanelProps) {
  const [selectedType, setSelectedType] = useState<RuleType>('category')
  const [selectedKey, setSelectedKey] = useState('')
  const [draftDays, setDraftDays] = useState(14)

  useEffect(() => {
    if (!isOpen) {
      setSelectedType('category')
      setSelectedKey('')
      setDraftDays(14)
    }
  }, [isOpen])

  const selectedCategory = selectedKey
    ? [...MOCK_AVAILABLE_CATEGORIES, ...MOCK_CATEGORIES_WITH_RULES].find(c => c.key === selectedKey)
    : null

  const selectedProduct = selectedKey
    ? [...MOCK_AVAILABLE_PRODUCTS, ...MOCK_PRODUCTS_WITH_RULES].find(p => p.key === selectedKey)
    : null

  const isAvailable =
    selectedType === 'category'
      ? MOCK_AVAILABLE_CATEGORIES.some(c => c.key === selectedKey)
      : MOCK_AVAILABLE_PRODUCTS.some(p => p.key === selectedKey)

  const productsCount =
    selectedType === 'category' ? (selectedCategory?.count ?? 0) : selectedProduct ? 1 : 0

  const displayProducts =
    selectedType === 'category'
      ? (selectedCategory?.products.slice(0, 4) ?? [])
      : selectedProduct
        ? [selectedProduct.name]
        : []

  const remaining = productsCount - displayProducts.length

  const expiryExample = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + draftDays)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }, [draftDays])

  const canCreate = selectedKey !== '' && isAvailable

  const handleTypeChange = (type: RuleType) => {
    setSelectedType(type)
    setSelectedKey('')
  }

  const handleCreate = () => {
    if (!canCreate) return
    const name =
      selectedType === 'category' ? (selectedCategory?.name ?? '') : (selectedProduct?.name ?? '')
    onCreate({
      name,
      type: selectedType,
      products_count: productsCount,
      status: 'active',
      shelf_life_days: draftDays,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 w-full sm:max-w-[500px]">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="text-xl font-bold">Create automation rule</SheetTitle>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {/* Rule Type */}
          <div className="flex flex-col gap-2">
            <Typography variant="h5" className="font-semibold">
              Rule Type
            </Typography>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('category')}
                className={cn(
                  'flex-1 px-4 py-3 border-2 rounded-lg text-left transition-all',
                  selectedType === 'category'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  <Typography variant="p" className="font-medium">
                    Category
                  </Typography>
                </div>
                <Typography variant="small" color="muted" className="mt-1 block">
                  Apply to all products in a category
                </Typography>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('product')}
                className={cn(
                  'flex-1 px-4 py-3 border-2 rounded-lg text-left transition-all',
                  selectedType === 'product'
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-border bg-card hover:border-muted-foreground/30',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                  <Typography variant="p" className="font-medium">
                    Product
                  </Typography>
                </div>
                <Typography variant="small" color="muted" className="mt-1 block">
                  Override for a specific product
                </Typography>
              </button>
            </div>
          </div>

          {/* Category / Product selection */}
          <div className="flex flex-col gap-2">
            <Typography variant="h5" className="font-semibold">
              {selectedType === 'category' ? 'Category' : 'Product'}
            </Typography>
            <div className="relative">
              <select
                value={selectedKey}
                onChange={e => setSelectedKey(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">
                  {selectedType === 'category' ? 'Select a category...' : 'Select a product...'}
                </option>
                <optgroup label="Available">
                  {selectedType === 'category'
                    ? MOCK_AVAILABLE_CATEGORIES.map(c => (
                        <option key={c.key} value={c.key}>
                          {c.name} ({c.count} {c.count === 1 ? 'product' : 'products'})
                        </option>
                      ))
                    : MOCK_AVAILABLE_PRODUCTS.map(p => (
                        <option key={p.key} value={p.key}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                </optgroup>
                <optgroup label="Already have rules">
                  {selectedType === 'category'
                    ? MOCK_CATEGORIES_WITH_RULES.map(c => (
                        <option key={c.key} value={c.key} disabled>
                          {c.name} ({c.count} {c.count === 1 ? 'product' : 'products'}) ✓
                        </option>
                      ))
                    : MOCK_PRODUCTS_WITH_RULES.map(p => (
                        <option key={p.key} value={p.key} disabled>
                          {p.name} ✓
                        </option>
                      ))}
                </optgroup>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <Typography variant="small" color="muted">
              {selectedType === 'category'
                ? 'Categories with ✓ already have automation rules'
                : 'Products with ✓ already have automation rules'}
            </Typography>
          </div>

          {/* Shelf life */}
          <div className="flex flex-col gap-2">
            <Typography variant="h5" className="font-semibold">
              Shelf life (days)
            </Typography>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={draftDays}
                onChange={e => setDraftDays(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Typography variant="small" color="muted">
              Example: Delivered today → Expires {expiryExample}
            </Typography>
          </div>

          {/* Products covered — shown only once a selection is made */}
          {selectedKey && (selectedCategory || selectedProduct) && (
            <div className="flex flex-col gap-2">
              <Typography variant="h5" className="font-semibold">
                Products covered
              </Typography>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    selectedType === 'product' ? 'bg-green-500' : 'bg-primary',
                  )}
                />
                <Typography variant="p" color="muted">
                  {productsCount} {productsCount === 1 ? 'product' : 'products'}
                </Typography>
              </div>
              {displayProducts.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex flex-col gap-1.5">
                    {displayProducts.map(name => (
                      <div
                        key={name}
                        className="text-sm text-gray-600 px-3 py-2 bg-gray-100 rounded-lg"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                  {remaining > 0 && (
                    <button
                      type="button"
                      className="text-center py-1 text-gray-500 hover:text-gray-900 transition-all cursor-pointer duration-100 ease-in-out text-sm"
                      onClick={() => {
                        console.log('show more products')
                      }}
                    >
                      + {remaining} more
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info box */}
          <div className="flex flex-col gap-1">
            <Typography variant="p" className="font-semibold">
              These rules automatically add expiry dates to products.
            </Typography>
            <Typography variant="p" color="muted">
              When deliveries are logged, expiry dates will be calculated using this shelf life
              instead of manual entry.
            </Typography>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canCreate} onClick={handleCreate}>
            Create rule
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
