'use client'

import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import type { TrackingSettingsProps } from './types'
import { useProductActions } from '@/hooks/use-products'
import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { toast } from 'sonner'
import { updateStoreCategoryShelfLife } from '@/lib/queries/products'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/utils/logger'

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
      logger.warn('TrackingSettings', 'Invalid shelf life received', {
        received: shelfLifeDays,
        default: DEFAULT_SHELF_LIFE_DAYS,
      })
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

      // Refetch product queries to ensure immediate consistency
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: queryKeys.products.detail(productId),
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.products.all,
        }),
      ])

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
    <div className="bg-muted rounded-3xl p-4 flex flex-col gap-4">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-0"
      >
        <Typography variant="p" className="flex items-center gap-2">
          Tracking settings
        </Typography>
        <ChevronDown className={cn('size-3 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="gap-4 flex flex-col">
          {/* Tracking mode */}
          <div className="flex gap-4 items-center justify-between">
            <Typography variant="p">Category</Typography>
            <Typography variant="p">{categoryName}</Typography>
          </div>

          <div className="flex gap-4 items-center justify-between">
            <Typography variant="p" className="capitalize">
              Mode
            </Typography>
            <div className="flex gap-1 bg-muted text-foreground rounded-full p-2 w-fit">
              {(['auto', 'manual'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleTrackingModeToggle(mode)}
                  disabled={isUpdating}
                  className={cn(
                    'px-4 py-2 rounded-full',
                    trackingMode === mode
                      ? 'bg-muted-foreground/10 text-foreground'
                      : 'bg-muted text-muted-foreground',
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
              <div className="flex gap-4 items-center justify-between">
                <Typography variant="p">Shelf life</Typography>
                <div className="flex gap-1">
                  <div className="items-center flex gap-1 bg-muted-foreground/10 text-foreground rounded-full p-2 w-fit">
                    <Input
                      type="number"
                      value={editedShelfLife}
                      onChange={e => {
                        setEditedShelfLife(e.target.value)
                        setIsDirty(true)
                      }}
                      disabled={isSaving || isUpdating}
                      className="max-w-20"
                      min={MIN_SHELF_LIFE_DAYS}
                      size="sm"
                    />
                    <Typography className="capitalize" variant="p">
                      days
                    </Typography>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    disabled={!isDirty}
                    loading={isSaving || isUpdating}
                    loadingText="Saving..."
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 items-center justify-between mt-2">
                <Typography variant="p">Source</Typography>
                <Typography variant="p">
                  {shelfLifeSource === 'product_override' &&
                    `Custom override (${shelfLifeDays} days)`}
                  {shelfLifeSource === 'store_category_override' &&
                    `Store override (${categoryName})`}
                  {shelfLifeSource === 'product_base' && `Product default (${categoryName})`}
                  {shelfLifeSource === 'category_base' && `Inherited from ${categoryName}`}
                  {shelfLifeSource === 'default' && 'System default (14 days)'}
                  {!shelfLifeSource && `Product default (${categoryName})`}
                </Typography>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
