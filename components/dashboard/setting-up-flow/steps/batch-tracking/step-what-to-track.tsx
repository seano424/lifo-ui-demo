'use client'

import { useState, type ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Toggle } from './toggle'
import { useTranslations } from 'next-intl'
import { Package, CheckCheck, SlidersHorizontal, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcessedCategory } from '../batch-tracking-step'

type SelectionMode = 'all' | 'manual' | null

interface StepWhatToTrackProps {
  categories: ProcessedCategory[]
  enabledCategories: ProcessedCategory[]
  onToggleCategory: (categoryId: string, enabled: boolean) => void
  onNext: () => void
  onBack: () => void
}

/**
 * Step 1: What to Track
 *
 * Entry screen: two option cards — "Track everything" or "Choose categories manually".
 * Category list only revealed when the user picks manual selection.
 */
export function StepWhatToTrack({
  categories,
  enabledCategories,
  onToggleCategory,
  onNext,
  onBack,
}: StepWhatToTrackProps) {
  const t = useTranslations('setupFlow.batchTracking.steps.whatToTrack')
  const t2 = useTranslations('setupFlow')
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('all')

  const enabledIds = new Set(enabledCategories.map(c => c.id))
  const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0)
  const trackedProducts = enabledCategories.reduce((sum, cat) => sum + cat.productCount, 0)
  const allSelected = enabledIds.size === categories.length && categories.length > 0

  const canProceed =
    selectionMode === 'all' || (selectionMode === 'manual' && enabledCategories.length > 0)

  const handleSelectAll = () => {
    categories.forEach(cat => onToggleCategory(cat.id, true))
    setSelectionMode('all')
  }

  const handleSelectManual = () => {
    setSelectionMode('manual')
  }

  const handleBack = () => {
    onBack()
  }

  const handleToggleAll = (checked: boolean) => {
    categories.forEach(cat => onToggleCategory(cat.id, checked))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 p-4 text-center">
        <Typography variant="h2" className="font-extrabold">
          {t('title')}
        </Typography>

        <Typography variant="p" color="muted" className="max-w-lg mx-auto">
          {t('description')}
        </Typography>
      </div>

      {/* Option Cards */}
      <div className="flex flex-col gap-3">
        <OptionCard
          selected={selectionMode === 'all'}
          icon={<CheckCheck className="h-5 w-5" />}
          label={t('options.trackAll.label')}
          description={t('options.trackAll.description', { count: totalProducts.toLocaleString() })}
          onClick={handleSelectAll}
        />
        <OptionCard
          selected={selectionMode === 'manual'}
          icon={<SlidersHorizontal className="h-5 w-5" />}
          label={t('options.chooseManually.label')}
          description={t('options.chooseManually.description')}
          onClick={handleSelectManual}
        />
      </div>

      {/* Category List — only shown in manual mode */}
      {selectionMode === 'manual' && (
        <div className="flex flex-col px-4">
          <Card className="flex flex-col gap-3 overflow-hidden max-h-[350px] overflow-y-auto scrollbar-none border-b border-border rounded-b-none p-2">
            {categories.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <Typography variant="small">{t('noCategories')}</Typography>
              </div>
            ) : (
              <>
                {/* Select All Toggle */}
                <div className="flex items-center justify-between py-2 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={allSelected}
                      onCheckedChange={handleToggleAll}
                      // disabled={allSelected}
                    />
                    <Typography
                      variant="p"
                      className={`font-medium transition-colors ${
                        !allSelected ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {t('selectAll')}
                    </Typography>
                  </div>
                  {/* Show the total number of products selected */}
                  <Typography variant="small" color="muted" className="font-mono tracking-tighter">
                    {trackedProducts.toLocaleString()} / {totalProducts.toLocaleString()}{' '}
                  </Typography>
                </div>
                <div className="max-h-[400px] overflow-y-auto scrollbar-none">
                  {/* Category List */}
                  {categories.map(category => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      enabled={enabledIds.has(category.id)}
                      allSelected={allSelected}
                      onToggle={onToggleCategory}
                    />
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Summary */}
      {selectionMode !== null && (
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-end">
            {/* <Typography variant="small" className="font-mono tracking-tighter">
              {t('summary.tracking')}
            </Typography> */}
            <Typography variant="small" className="font-mono tracking-tighter">
              {trackedProducts.toLocaleString()} {t('summary.of')} {totalProducts.toLocaleString()}{' '}
              {t('summary.products')}
            </Typography>
          </div>
          {/* {selectionMode === 'manual' && enabledCategories.length > 0 && <div className="flex flex-col gap-1">
            <Typography variant="small" className="font-mono tracking-tighter">
              {enabledCategories.map(category => category.name).join(', ')}
            </Typography>
          </div>} */}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          {t('backButton')}
        </Button>

        <Button onClick={onNext} disabled={!canProceed} className="w-fit">
          {t2('steps.addStore.importSummary.continueButton')}
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// OPTION CARD
// =============================================================================

interface OptionCardProps {
  selected: boolean
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
}

function OptionCard({ selected, icon, label, description, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-4 p-4 rounded-xl border border-border transition-all',
        selected ? 'border-foreground' : 'hover:bg-muted',
      )}
    >
      <div
        className={cn(
          'shrink-0 p-2 rounded-lg transition-colors',
          selected
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'text-muted-foreground',
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <Typography variant="p">{label}</Typography>
        <Typography variant="p" color="muted">
          {description}
        </Typography>
      </div>
      {selected && (
        <Check className="shrink-0 size-5 text-primary rounded-full bg-primary-100 p-1" />
      )}
    </button>
  )
}

// =============================================================================
// CATEGORY ROW
// =============================================================================

interface CategoryRowProps {
  category: ProcessedCategory
  enabled: boolean
  allSelected: boolean
  onToggle: (categoryId: string, enabled: boolean) => void
}

function CategoryRow({ category, enabled, onToggle }: CategoryRowProps) {
  const shouldMute = !enabled

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Toggle checked={enabled} onCheckedChange={checked => onToggle(category.id, checked)} />
        <Typography
          variant="p"
          className={`font-medium transition-colors ${shouldMute ? 'text-muted-foreground' : ''}`}
        >
          {category.name}
        </Typography>
      </div>
      <Typography variant="small" color="muted" className="font-mono">
        {category.productCount}
      </Typography>
    </div>
  )
}
