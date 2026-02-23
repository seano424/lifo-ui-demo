'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, X } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { useProductsForTrackingSetup } from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { ProductRow } from './product-row'
import { ProductEditSheet } from './product-edit-sheet'
import type { ProductState } from './product-row'
import { RulesSectionHeader } from './shared/rules-section-header'
import { RulesList } from './shared/rules-list'

type ProductStateMap = Record<string, ProductState | null>

function ProductListSkeleton() {
  return (
    <div className="border-[1.5px] border-border rounded-2xl overflow-hidden divide-y divide-border">
      {[1, 2, 3].map(i => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-[14px]">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full shrink-0" />
          <Skeleton className="h-4 w-14 rounded shrink-0" />
        </div>
      ))}
    </div>
  )
}

export interface ProductRulesSectionHandle {
  getProductOverrides: () => Array<{
    product_id: string
    shelf_life_override_days: number | null
    auto_create_batches: boolean
  }>
}

export const ProductRulesSection = forwardRef<ProductRulesSectionHandle>(
  function ProductRulesSection(_, ref) {
    const storeId = useActiveStoreId()

    const [searchTerm, setSearchTerm] = useState('')
    const [committedSearch, setCommittedSearch] = useState('')
    const [productStates, setProductStates] = useState<ProductStateMap>({})
    const [productInitialized, setProductInitialized] = useState(false)

    // Sheet — same pattern as CategoryRulesSection
    const [editingProductId, setEditingProductId] = useState<string | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    const { data: products, isLoading } = useProductsForTrackingSetup(storeId || '', {
      searchTerm: committedSearch || null,
      pageSize: 50,
    })

    // Initialize product override states from DB data (once per load)
    useEffect(() => {
      if (products && !productInitialized) {
        const overrides: ProductStateMap = {}
        for (const p of products) {
          if (p.auto_create_batches !== null || p.shelf_life_override_days !== null) {
            overrides[p.product_id] = {
              mode: p.auto_create_batches ? 'auto' : 'manual',
              days: p.shelf_life_override_days,
            }
          } else {
            overrides[p.product_id] = null
          }
        }
        setProductStates(prev => ({ ...overrides, ...prev }))
        setProductInitialized(true)
      }
    }, [products, productInitialized])

    // Reset product init when search changes so new pages init properly
    // biome-ignore lint/correctness/useExhaustiveDependencies: committedSearch triggers reset without being used in body
    useEffect(() => {
      setProductInitialized(false)
    }, [committedSearch])

    // Reset when store changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: storeId triggers reset without being used in body
    useEffect(() => {
      setProductInitialized(false)
      setProductStates({})
    }, [storeId])

    // Debounce search input
    useEffect(() => {
      const timer = setTimeout(() => {
        setCommittedSearch(searchTerm)
      }, 350)
      return () => clearTimeout(timer)
    }, [searchTerm])

    useImperativeHandle(
      ref,
      () => ({
        getProductOverrides: () =>
          Object.entries(productStates)
            .filter(([_id, state]) => state !== null)
            .map(([productId, state]) => ({
              product_id: productId,
              shelf_life_override_days: state!.mode === 'auto' ? state!.days : null,
              auto_create_batches: state!.mode === 'auto',
            })),
      }),
      [productStates],
    )

    const handleUpdateProduct = useCallback((productId: string, state: ProductState | null) => {
      setProductStates(prev => ({ ...prev, [productId]: state }))
    }, [])

    const handleEdit = useCallback((productId: string) => {
      setEditingProductId(productId)
      setIsSheetOpen(true)
    }, [])

    const handleSheetClose = useCallback(() => {
      setIsSheetOpen(false)
      // Keep editingProductId alive so Radix can animate out before unmounting
    }, [])

    const handleSheetSave = useCallback(
      (state: ProductState | null) => {
        if (editingProductId) {
          handleUpdateProduct(editingProductId, state)
        }
        setIsSheetOpen(false)
      },
      [editingProductId, handleUpdateProduct],
    )

    const editingProduct = editingProductId
      ? (products?.find(p => p.product_id === editingProductId) ?? null)
      : null

    const emptyMessage = committedSearch
      ? `No products match "${committedSearch}"`
      : 'No products found.'

    return (
      <section className="flex flex-col gap-5">
        <RulesSectionHeader
          title="Product Rules"
          description="Override category defaults for individual products — useful when specific items have different shelf lives than their category."
        />

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search products…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-shadow"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <RulesList
          isLoading={isLoading}
          skeleton={<ProductListSkeleton />}
          isEmpty={!products || products.length === 0}
          emptyMessage={emptyMessage}
        >
          {products?.map(product => (
            <ProductRow
              key={product.product_id}
              product={product}
              override={productStates[product.product_id] ?? null}
              onEdit={() => handleEdit(product.product_id)}
            />
          ))}
        </RulesList>

        {products && products.length >= 50 && (
          <Typography variant="small" color="muted" className="text-center">
            Showing first 50 products. Use search to find specific items.
          </Typography>
        )}

        {/* One shared sheet for the whole section — kept mounted with isOpen=false during close animation */}
        {editingProduct && (
          <ProductEditSheet
            product={editingProduct}
            currentOverride={productStates[editingProduct.product_id] ?? null}
            isOpen={isSheetOpen}
            onClose={handleSheetClose}
            onSave={handleSheetSave}
          />
        )}
      </section>
    )
  },
)
