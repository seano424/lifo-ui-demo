'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useCategoriesWithTrackingSettings } from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { CategoryRow } from './category-row'
import { CategoryEditSheet } from './category-edit-sheet'
import type { CategoryState } from './category-row'
import { RulesSectionHeader } from './shared/rules-section-header'
import { RulesList } from './shared/rules-list'

const DEFAULT_SHELF_LIFE = 14

function CategoryListSkeleton() {
  return (
    <div className="border-[1.5px] border-border rounded-2xl overflow-hidden divide-y divide-border">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-[14px]">
          <Skeleton className="w-[38px] h-[38px] rounded-[10px] shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full shrink-0" />
          <Skeleton className="h-4 w-14 rounded shrink-0" />
        </div>
      ))}
    </div>
  )
}

export interface CategoryRulesSectionHandle {
  getCategorySettings: () => Array<{
    category_id: string
    is_tracked: boolean
    auto_create_batches: boolean
    default_shelf_life_days: number | null
  }>
  getSelectedCategoryIds: () => string[]
}

export const CategoryRulesSection = forwardRef<CategoryRulesSectionHandle>(
  function CategoryRulesSection(_, ref) {
    const storeId = useActiveStoreId()

    const { data: categories, isLoading } = useCategoriesWithTrackingSettings(storeId || '')

    const [categoryStates, setCategoryStates] = useState<Record<string, CategoryState>>({})
    const [categoryInitialized, setCategoryInitialized] = useState(false)
    const [bulkActive, setBulkActive] = useState<'auto' | 'manual' | null>(null)

    // Sheet — track which category is being edited + open state separately
    // so the close animation (Radix Dialog) can complete before the category is cleared
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    // Initialize from DB data (once)
    useEffect(() => {
      if (categories && !categoryInitialized) {
        const states: Record<string, CategoryState> = {}
        for (const cat of categories) {
          states[cat.category_id] = {
            mode: cat.auto_create_batches ? 'auto' : 'manual',
            days: cat.default_shelf_life_days,
          }
        }
        setCategoryStates(states)
        setCategoryInitialized(true)
      }
    }, [categories, categoryInitialized])

    // Reset when store changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: storeId triggers reset without being used in body
    useEffect(() => {
      setCategoryInitialized(false)
      setBulkActive(null)
    }, [storeId])

    useImperativeHandle(
      ref,
      () => ({
        getCategorySettings: () =>
          categories?.map(cat => {
            const state = categoryStates[cat.category_id]
            const isAuto = state?.mode === 'auto'
            return {
              category_id: cat.category_id,
              is_tracked: true,
              auto_create_batches: isAuto,
              default_shelf_life_days: isAuto ? (state?.days ?? DEFAULT_SHELF_LIFE) : null,
            }
          }) ?? [],
        getSelectedCategoryIds: () => categories?.map(c => c.category_id) ?? [],
      }),
      [categories, categoryStates],
    )

    const handleSetAllAuto = () => {
      setCategoryStates(prev => {
        const next = { ...prev }
        for (const id of Object.keys(next)) {
          next[id] = { ...next[id], mode: 'auto' }
        }
        return next
      })
      setBulkActive('auto')
    }

    const handleSetAllManual = () => {
      setCategoryStates(prev => {
        const next = { ...prev }
        for (const id of Object.keys(next)) {
          next[id] = { ...next[id], mode: 'manual' }
        }
        return next
      })
      setBulkActive('manual')
    }

    const handleUpdateCategory = useCallback((categoryId: string, state: CategoryState) => {
      setCategoryStates(prev => ({ ...prev, [categoryId]: state }))
      setBulkActive(null)
    }, [])

    const handleEdit = useCallback((categoryId: string) => {
      setEditingCategoryId(categoryId)
      setIsSheetOpen(true)
    }, [])

    const handleSheetClose = useCallback(() => {
      setIsSheetOpen(false)
      // Keep editingCategoryId alive so Radix can animate out before unmounting
    }, [])

    const handleSheetSave = useCallback(
      (newState: CategoryState) => {
        if (editingCategoryId) {
          handleUpdateCategory(editingCategoryId, newState)
        }
        setIsSheetOpen(false)
      },
      [editingCategoryId, handleUpdateCategory],
    )

    const editingCategory = editingCategoryId
      ? (categories?.find(c => c.category_id === editingCategoryId) ?? null)
      : null

    return (
      <section className="flex flex-col gap-5">
        <RulesSectionHeader
          title="Category Rules"
          description="Set the default expiry calculation method for each product category."
        />

        {/* Bulk actions */}
        {!isLoading && (categories?.length ?? 0) > 0 && (
          <div
            className="flex items-center gap-2 text-[13px]"
            style={{ color: 'var(--ob-text-secondary)' }}
          >
            <span>Set all to:</span>
            <button
              type="button"
              onClick={handleSetAllAuto}
              className={cn(
                'px-[14px] py-[5px] rounded-full border text-[12px] font-medium cursor-pointer transition-all duration-200',
                bulkActive === 'auto'
                  ? 'bg-secondary border-secondary text-white'
                  : 'bg-white border-border hover:border-secondary hover:text-secondary',
              )}
            >
              ⚡ Auto-track
            </button>
            <button
              type="button"
              onClick={handleSetAllManual}
              className={cn(
                'px-[14px] py-[5px] rounded-full border text-[12px] font-medium cursor-pointer transition-all duration-200',
                bulkActive === 'manual'
                  ? 'bg-secondary border-secondary text-white'
                  : 'bg-white border-border hover:border-secondary hover:text-secondary',
              )}
            >
              ✏️ Manual
            </button>
          </div>
        )}

        <RulesList
          isLoading={isLoading}
          skeleton={<CategoryListSkeleton />}
          isEmpty={!categories || categories.length === 0}
          emptyMessage="No categories found. Connect a store to configure automations."
        >
          {categories?.map(cat => (
            <CategoryRow
              key={cat.category_id}
              category={cat}
              state={
                categoryStates[cat.category_id] ?? {
                  mode: cat.auto_create_batches ? 'auto' : 'manual',
                  days: cat.default_shelf_life_days,
                }
              }
              onEdit={() => handleEdit(cat.category_id)}
            />
          ))}
        </RulesList>

        {/* One shared sheet for the whole section — kept mounted with isOpen=false during close animation */}
        {editingCategory && (
          <CategoryEditSheet
            category={editingCategory}
            currentState={
              categoryStates[editingCategory.category_id] ?? {
                mode: editingCategory.auto_create_batches ? 'auto' : 'manual',
                days: editingCategory.default_shelf_life_days,
              }
            }
            isOpen={isSheetOpen}
            onClose={handleSheetClose}
            onSave={handleSheetSave}
          />
        )}
      </section>
    )
  },
)
