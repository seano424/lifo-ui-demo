'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import type { TrackingSettingsProps } from './types'
import { useProductActions } from '@/hooks/use-products'
import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { toast } from 'sonner'
import { updateStoreCategoryShelfLife } from '@/lib/queries/products'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'

const MIN_SHELF_LIFE_DAYS = 1
const DEFAULT_SHELF_LIFE_DAYS = 14

export function TrackingSettings({
  productId,
  categoryId,
  shelfLifeDays,
  shelfLifeSource,
  categoryName,
  initialTrackingMode = 'auto',
}: TrackingSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editedShelfLife, setEditedShelfLife] = useState(String(shelfLifeDays))
  const [trackingMode, setTrackingMode] = useState<'auto' | 'manual'>(initialTrackingMode)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const activeStoreId = useActiveStoreId()
  const { updateProduct, isUpdating } = useProductActions()
  const queryClient = useQueryClient()

  // Sync tracking mode when product data changes
  useEffect(() => {
    setTrackingMode(initialTrackingMode)
  }, [initialTrackingMode])

  // Validate shelf life on mount and when it changes
  useEffect(() => {
    if (shelfLifeDays < MIN_SHELF_LIFE_DAYS) {
      console.warn(
        `[TrackingSettings] Invalid shelf life received: ${shelfLifeDays}. Using default: ${DEFAULT_SHELF_LIFE_DAYS}`,
      )
      setEditedShelfLife(String(DEFAULT_SHELF_LIFE_DAYS))
    } else {
      setEditedShelfLife(String(shelfLifeDays))
    }
    setIsDirty(false) // Reset dirty state when prop changes
  }, [shelfLifeDays])

  const handleSave = async () => {
    const newShelfLife = parseInt(editedShelfLife, 10)

    // Validation
    if (Number.isNaN(newShelfLife) || newShelfLife < MIN_SHELF_LIFE_DAYS) {
      toast.error(`Shelf life must be at least ${MIN_SHELF_LIFE_DAYS} day`)
      setEditedShelfLife(
        String(shelfLifeDays >= MIN_SHELF_LIFE_DAYS ? shelfLifeDays : DEFAULT_SHELF_LIFE_DAYS),
      )
      return
    }

    if (!activeStoreId) {
      toast.error('No active store selected')
      return
    }

    if (!categoryId) {
      toast.error('Category information is missing')
      return
    }

    setIsSaving(true)

    try {
      // Update store_category_settings.default_shelf_life_days (store-wide category default)
      await updateStoreCategoryShelfLife(activeStoreId, categoryId, newShelfLife)

      // Invalidate product queries to refetch with new shelf life
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(productId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.all,
      })

      toast.success(`Updated shelf life for ${categoryName} category`)
      setIsDirty(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update category shelf life')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTrackingModeToggle = (newMode: 'auto' | 'manual') => {
    if (!activeStoreId) {
      toast.error('No active store selected')
      return
    }

    setTrackingMode(newMode)

    if (newMode === 'manual') {
      // Switch to manual: Clear product override (fall back to category/manual entry)
      updateProduct({
        productId,
        updates: { shelf_life_override_days: null },
      })
      toast.success('Switched to manual tracking - expiry dates will be entered manually')
    } else {
      // Switch to auto: Set product override to current effective value
      const currentShelfLife = parseInt(editedShelfLife, 10)
      const validShelfLife =
        !Number.isNaN(currentShelfLife) && currentShelfLife >= MIN_SHELF_LIFE_DAYS
          ? currentShelfLife
          : shelfLifeDays

      updateProduct({
        productId,
        updates: { shelf_life_override_days: validShelfLife },
      })
      toast.success(`Switched to auto tracking - using ${validShelfLife} day shelf life`)
    }
  }

  return (
    <div className="px-5 py-3 border-t border-border/50">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <ChevronRight className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')} />
        Tracking settings
      </button>

      {isOpen && (
        <div className="mt-3 pl-0.5 space-y-3">
          {/* Tracking mode */}
          <div className="flex items-center gap-3">
            <Typography variant="small" className="text-muted-foreground w-24">
              Mode
            </Typography>
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {(['auto', 'manual'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleTrackingModeToggle(mode)}
                  disabled={isUpdating}
                  className={cn(
                    'text-xs font-medium px-3 py-1 rounded-md transition-all',
                    trackingMode === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                    isUpdating && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Shelf life (only shown in auto mode) */}
          {trackingMode === 'auto' && (
            <>
              <div className="flex items-center gap-3">
                <Typography variant="small" className="text-muted-foreground w-24">
                  Shelf life
                </Typography>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editedShelfLife}
                    onChange={e => {
                      setEditedShelfLife(e.target.value)
                      setIsDirty(true)
                    }}
                    disabled={isSaving || isUpdating}
                    className={cn(
                      'w-16 border rounded-lg px-2.5 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
                      isDirty ? 'border-primary' : 'border-border',
                    )}
                    min={MIN_SHELF_LIFE_DAYS}
                  />
                  <Typography variant="small" className="text-muted-foreground">
                    days
                  </Typography>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving || isUpdating}
                    loading={isSaving}
                    loadingText="Saving..."
                    className="ml-2"
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Typography variant="small" className="text-muted-foreground w-24">
                  Source
                </Typography>
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {shelfLifeSource === 'product_override' &&
                    `Custom override (${shelfLifeDays} days)`}
                  {shelfLifeSource === 'store_category_override' &&
                    `Store override (${categoryName})`}
                  {shelfLifeSource === 'product_base' && `Product default (${categoryName})`}
                  {shelfLifeSource === 'category_base' && `Inherited from ${categoryName}`}
                  {shelfLifeSource === 'default' && 'System default (14 days)'}
                  {!shelfLifeSource && `Product default (${categoryName})`}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
