'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCategoriesWithTrackingSettings } from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
import type { AutomationRule } from '@/lib/queries/dashboard'

// Product-type rule creation is not yet wired to real data — coming in a future task.
// Category rules are fully wired.

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

  const [selectedKey, setSelectedKey] = useState('')
  const [draftDays, setDraftDays] = useState(14)

  // Categories that don't yet have auto_create_batches enabled
  const availableCategories = useMemo(
    () => categories.filter(c => !c.auto_create_batches),
    [categories],
  )

  // Categories that already have a rule
  const categoriesWithRules = useMemo(
    () => categories.filter(c => c.auto_create_batches),
    [categories],
  )

  const selectedCategory = useMemo(
    () => categories.find(c => c.category_id === selectedKey) ?? null,
    [categories, selectedKey],
  )

  const isAvailable = availableCategories.some(c => c.category_id === selectedKey)

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
      setSelectedKey('')
      setDraftDays(14)
    }
  }, [isOpen])

  const canCreate = selectedKey !== '' && isAvailable

  const handleCreate = () => {
    if (!canCreate || !selectedCategory) return
    onCreate({
      rule_id: selectedCategory.category_id,
      name: selectedCategory.display_name_en,
      type: 'category',
      products_count: selectedCategory.product_count,
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
          {/* Category selection */}
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

          {/* Products covered — shown only once a category is selected */}
          {selectedCategory && (
            <div className="flex flex-col gap-2">
              <Typography variant="h5" className="font-semibold">
                Products covered
              </Typography>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
                <Typography variant="p" color="muted">
                  {selectedCategory.product_count}{' '}
                  {selectedCategory.product_count === 1 ? 'product' : 'products'}
                </Typography>
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
