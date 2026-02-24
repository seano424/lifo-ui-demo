'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  useCategoriesWithTrackingSettings,
  useProductsForTrackingSetup,
} from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'
import type { AutomationRule } from '@/lib/queries/dashboard'

interface AddAutomationRulePanelProps {
  isOpen: boolean
  isSaving?: boolean
  onClose: () => void
  onCreate: (rule: AutomationRule) => void
}

export function AddAutomationRulePanel({
  isOpen,
  isSaving = false,
  onClose,
  onCreate,
}: AddAutomationRulePanelProps) {
  const activeStoreId = useActiveStoreId() || ''
  const { data: categories = [] } = useCategoriesWithTrackingSettings(activeStoreId)

  const [ruleType, setRuleType] = useState<'category' | 'product'>('category')
  const [selectedKey, setSelectedKey] = useState('')
  const [draftDays, setDraftDays] = useState(14)
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')

  // Debounce product search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch), 400)
    return () => clearTimeout(timer)
  }, [productSearch])

  const { data: products = [] } = useProductsForTrackingSetup(activeStoreId, {
    searchTerm: debouncedProductSearch || null,
    pageSize: 50,
  })

  // Fetch products for the selected category to show names under "Products covered"
  const { data: categoryProducts = [] } = useProductsForTrackingSetup(
    ruleType === 'category' && selectedKey ? activeStoreId : '',
    { categoryId: selectedKey || null, pageSize: 100 },
  )

  // Categories that don't yet have auto_create_batches enabled (and have products)
  const availableCategories = useMemo(
    () => categories.filter(c => !c.auto_create_batches && c.product_count > 0),
    [categories],
  )

  // Categories that already have a rule (and have products)
  const categoriesWithRules = useMemo(
    () => categories.filter(c => c.auto_create_batches && c.product_count > 0),
    [categories],
  )

  // Products without a shelf life override (available for new rules)
  const availableProducts = useMemo(
    () => products.filter(p => p.shelf_life_override_days === null),
    [products],
  )

  // Products that already have a shelf life override (already have rules)
  const productsWithRules = useMemo(
    () => products.filter(p => p.shelf_life_override_days !== null),
    [products],
  )

  const selectedCategory = useMemo(
    () => categories.find(c => c.category_id === selectedKey) ?? null,
    [categories, selectedKey],
  )

  const selectedProduct = useMemo(
    () => products.find(p => p.product_id === selectedKey) ?? null,
    [products, selectedKey],
  )

  const isAvailable =
    ruleType === 'category'
      ? availableCategories.some(c => c.category_id === selectedKey)
      : availableProducts.some(p => p.product_id === selectedKey)

  const expiryExample = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + draftDays)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }, [draftDays])

  useEffect(() => {
    if (!isOpen) {
      setRuleType('category')
      setSelectedKey('')
      setDraftDays(14)
      setProductSearch('')
      setDebouncedProductSearch('')
    }
  }, [isOpen])

  const handleTypeChange = (type: 'category' | 'product') => {
    setRuleType(type)
    setSelectedKey('')
  }

  const canCreate = selectedKey !== '' && isAvailable

  const handleCreate = () => {
    if (!canCreate) return
    if (ruleType === 'category' && selectedCategory) {
      onCreate({
        rule_id: selectedCategory.category_id,
        name: selectedCategory.display_name_en,
        type: 'category',
        products_count: selectedCategory.product_count,
        shelf_life_days: draftDays,
      })
    } else if (ruleType === 'product' && selectedProduct) {
      onCreate({
        rule_id: selectedProduct.product_id,
        name: selectedProduct.name,
        type: 'product',
        products_count: 1,
        shelf_life_days: draftDays,
      })
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 w-full sm:max-w-[500px]">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="text-xl font-bold">Create automation rule</SheetTitle>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {/* Rule type toggle */}
          <div className="flex flex-col gap-2">
            <Typography variant="h5" className="font-semibold">
              Rule type
            </Typography>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => handleTypeChange('category')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                  ruleType === 'category'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted',
                )}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('product')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-border',
                  ruleType === 'product'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted',
                )}
              >
                Product
              </button>
            </div>
          </div>

          {/* Category selection */}
          {ruleType === 'category' && (
            <div className="flex flex-col gap-2">
              <Typography variant="h5" className="font-semibold">
                Category
              </Typography>
              <div className="relative">
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a category...</option>
                  {availableCategories.length > 0 && (
                    <optgroup label="Available">
                      {availableCategories.map(c => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.display_name_en} ({c.product_count}{' '}
                          {c.product_count === 1 ? 'product' : 'products'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {categoriesWithRules.length > 0 && (
                    <optgroup label="Already have rules">
                      {categoriesWithRules.map(c => (
                        <option key={c.category_id} value={c.category_id} disabled>
                          {c.display_name_en} ✓
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <Typography variant="small" color="muted">
                Categories marked ✓ already have automation rules
              </Typography>
            </div>
          )}

          {/* Product selection */}
          {ruleType === 'product' && (
            <div className="flex flex-col gap-2">
              <Typography variant="h5" className="font-semibold">
                Product
              </Typography>
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="relative">
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a product...</option>
                  {availableProducts.length > 0 && (
                    <optgroup label="Available">
                      {availableProducts.map(p => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name}
                          {p.category_name ? ` — ${p.category_name}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {productsWithRules.length > 0 && (
                    <optgroup label="Already have rules">
                      {productsWithRules.map(p => (
                        <option key={p.product_id} value={p.product_id} disabled>
                          {p.name} ✓
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <Typography variant="small" color="muted">
                Products marked ✓ already have automation rules
              </Typography>
            </div>
          )}

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

          {/* Products covered — shown only for category rules once a category is selected */}
          {ruleType === 'category' && selectedCategory && (
            <div className="flex flex-col gap-2">
              <Typography variant="h5" className="font-semibold">
                Products covered
              </Typography>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
                  <Typography variant="p" color="muted">
                    {selectedCategory.product_count}{' '}
                    {selectedCategory.product_count === 1 ? 'product' : 'products'}
                  </Typography>
                </div>
                {categoryProducts.slice(0, 10).map(p => (
                  <Typography key={p.product_id} variant="small" color="muted" className="pl-4">
                    · {p.name}
                  </Typography>
                ))}
                {categoryProducts.length > 10 && (
                  <Typography variant="small" color="muted" className="pl-4">
                    and {categoryProducts.length - 10} more
                  </Typography>
                )}
              </div>
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
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button disabled={!canCreate || isSaving} onClick={handleCreate}>
            {isSaving ? 'Creating…' : 'Create rule'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
