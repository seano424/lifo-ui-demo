'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { AutomationRule } from '@/lib/queries/dashboard'

interface AutomationRulePanelProps {
  rule: AutomationRule | null
  isOpen: boolean
  onClose: () => void
  onSave: (rule: AutomationRule, shelfLifeDays: number) => void
  onDelete: (rule: AutomationRule) => void
}

const MOCK_PRODUCTS: Record<string, string[]> = {
  'rule-001': ['Whole Milk 1L', 'Greek Yogurt 500g', 'Cheddar Cheese 200g', 'Butter Unsalted 250g'],
  'rule-002': ['Tomato Soup 400g', 'Black Beans 400g', 'Tuna 185g', 'Corn Kernels 340g'],
  'rule-003': ['Fresh Bread 400g'],
  'rule-004': ['Mixed Nuts 250g', 'Potato Chips 150g', 'Granola Bar 40g', 'Popcorn 100g'],
}

export function AutomationRulePanel({
  rule,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: AutomationRulePanelProps) {
  const [draftDays, setDraftDays] = useState(rule?.shelf_life_days ?? 14)

  useEffect(() => {
    if (isOpen && rule) {
      setDraftDays(rule.shelf_life_days)
    }
  }, [isOpen, rule])

  const expiryExample = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + draftDays)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }, [draftDays])

  const productsList = rule ? (MOCK_PRODUCTS[rule.rule_id] ?? []) : []
  const displayProducts = productsList.slice(0, 4)
  const remaining = (rule?.products_count ?? 0) - displayProducts.length

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 w-full sm:max-w-[500px]">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="text-xl font-bold">
            Edit {rule?.type === 'product' ? 'product' : 'category'} rule
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {/* Rule name (display only) */}
          {/* <div className="flex flex-col gap-1.5">
            <Typography variant="h5">Rule name</Typography>
            <Typography variant="p">{rule?.name}</Typography>
          </div> */}

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Typography variant="h5" className="font-semibold">
              Rule Type
            </Typography>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  rule?.type === 'product' ? 'bg-green-500' : 'bg-primary',
                )}
              />
              <Typography variant="p" color="muted">
                {rule?.type === 'product' ? 'Product' : 'Category'}
              </Typography>
            </div>
          </div>

          {/* Product or Category Name */}
          <div className="flex flex-col gap-1.5">
            <Typography variant="h5" className="font-semibold">
              {rule?.type === 'product' ? 'Product' : 'Category'}
            </Typography>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  rule?.type === 'product' ? 'bg-green-500' : 'bg-primary',
                )}
              />
              <Typography variant="p" color="muted">
                {rule?.name}
              </Typography>
            </div>
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

          {/* Products covered */}
          <div className="flex flex-col gap-2">
            <Typography variant="h5" className="font-semibold">
              Products covered
            </Typography>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  rule?.type === 'product' ? 'bg-green-500' : 'bg-primary',
                )}
              />
              <Typography variant="p" color="muted">
                {rule?.products_count ?? 0}{' '}
                {(rule?.products_count ?? 0) === 1 ? 'product' : 'products'}
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
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => rule && onDelete(rule)}
          >
            Delete rule
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => rule && onSave(rule, draftDays)}>Save changes</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
