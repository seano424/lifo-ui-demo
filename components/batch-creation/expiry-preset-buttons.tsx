'use client'

import { addDays, format } from 'date-fns'
import { Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExpiryPresetButtonsProps {
  onSelect: (days: number) => void
  onPickDate: () => void
  selectedDays?: number | null
  suggestedDays?: number | null
  className?: string
}

const PRESET_DAYS = [
  { days: 3, label: '+3d' },
  { days: 7, label: '+7d' },
  { days: 14, label: '+14d' },
  { days: 30, label: '+30d' },
  { days: 60, label: '+60d' },
  { days: 90, label: '+90d' },
]

/**
 * Grid of preset expiry date buttons with date picker option
 * Highlights suggested days from product history
 *
 * @example
 * ```tsx
 * <ExpiryPresetButtons
 *   onSelect={(days) => setSelectedDays(days)}
 *   onPickDate={() => setShowDatePicker(true)}
 *   selectedDays={7}
 *   suggestedDays={7} // From last_expiry_days
 * />
 * ```
 */
export function ExpiryPresetButtons({
  onSelect,
  onPickDate,
  selectedDays,
  suggestedDays,
  className,
}: ExpiryPresetButtonsProps) {
  const t = useTranslations('inventory')

  const calculateDate = (days: number) => {
    return addDays(new Date(), days)
  }

  const formatDate = (date: Date) => {
    return format(date, 'MMMM d, yyyy')
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Preset Days Grid */}
      <div className="grid grid-cols-3 gap-2">
        {PRESET_DAYS.map(preset => {
          const isSelected = selectedDays === preset.days
          const isSuggested = suggestedDays === preset.days

          return (
            <Button
              key={preset.days}
              type="button"
              variant={isSelected ? 'default' : isSuggested ? 'subtle' : 'outline'}
              size="lg"
              onClick={() => onSelect(preset.days)}
              className={cn(
                // 44px minimum tap target
                'min-h-[44px] relative',
                ' text-base',
                'transition-all duration-200',
                isSelected && 'ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-gray-900',
                isSuggested && !isSelected && 'border-2 border-primary-600 dark:border-primary-500',
              )}
            >
              {preset.label}
              {/* Suggested indicator */}
              {isSuggested && !isSelected && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary-600 dark:bg-background ring-2 ring-white dark:ring-gray-900" />
              )}
            </Button>
          )
        })}
      </div>

      {/* Pick Date Button */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onPickDate}
        className={cn(
          'w-full min-h-[44px]',
          'border-2 border-dashed border-gray-300 dark:border-gray-600',
          'hover:border-gray-400 dark:hover:border-gray-500',
          '',
        )}
      >
        <Calendar className="h-5 w-5 mr-2" />
        Pick Custom Date
      </Button>

      {/* Selected Date Display */}
      {selectedDays !== null && selectedDays !== undefined && (
        <div className="text-center flex flex-col gap-1">
          <p className="text-sm text-foreground dark:text-foreground">
            {t('inventoryForm.labels.expiryDate')}
          </p>
          <p className="text-lg  text-foreground dark:text-foreground">
            {formatDate(calculateDate(selectedDays))}
          </p>
        </div>
      )}

      {/* Suggested indicator text */}
      {suggestedDays !== null && suggestedDays !== undefined && (
        <p className="text-xs text-center text-foreground dark:text-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600 dark:bg-background mr-1.5" />
          Suggested based on previous deliveries
        </p>
      )}
    </div>
  )
}
