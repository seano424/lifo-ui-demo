'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from 'next-intl'
import { Calendar, ChevronDown, X } from 'lucide-react'
import type { TodoTabType } from '../todos-filtered-list'
import { cn } from '@/lib/utils'

interface ExpiryFilterValue {
  min?: number
  max?: number
}

interface TodoExpiryFilterProps {
  activeTab: TodoTabType
  daysToExpiryMin?: number
  daysToExpiryMax?: number
  onExpiryChange: (value: ExpiryFilterValue) => void
  isLoading?: boolean
}

// Expiring presets (positive values - future dates)
const EXPIRING_PRESETS = [
  {
    value: 'all',
    translationKey: 'filters.expiry.expiring.all',
    min: 0,
    max: undefined,
  },
  {
    value: '3days',
    translationKey: 'filters.expiry.expiring.3days',
    min: 0,
    max: 3,
  },
  {
    value: '1week',
    translationKey: 'filters.expiry.expiring.1week',
    min: 0,
    max: 7,
  },
  {
    value: '2weeks',
    translationKey: 'filters.expiry.expiring.2weeks',
    min: 0,
    max: 14,
  },
  {
    value: '1month',
    translationKey: 'filters.expiry.expiring.1month',
    min: 0,
    max: 30,
  },
]

// Expired presets (negative values - past dates)
const EXPIRED_PRESETS = [
  {
    value: 'all',
    translationKey: 'filters.expiry.expired.all',
    min: undefined,
    max: -1,
  },
  {
    value: '3days',
    translationKey: 'filters.expiry.expired.3days',
    min: -3,
    max: -1,
  },
  {
    value: '1week',
    translationKey: 'filters.expiry.expired.1week',
    min: -7,
    max: -1,
  },
  {
    value: '2weeks',
    translationKey: 'filters.expiry.expired.2weeks',
    min: -14,
    max: -1,
  },
  {
    value: '1month',
    translationKey: 'filters.expiry.expired.1month',
    min: -30,
    max: -1,
  },
]

// General presets for other tabs
const GENERAL_PRESETS = [
  {
    value: 'all',
    translationKey: 'filters.expiry.general.all',
    min: undefined,
    max: undefined,
  },
  {
    value: 'expiring_soon',
    translationKey: 'filters.expiry.general.expiringSoon',
    min: 0,
    max: 7,
  },
  {
    value: 'recently_expired',
    translationKey: 'filters.expiry.general.recentlyExpired',
    min: -7,
    max: -1,
  },
]

export function TodoExpiryFilter({
  activeTab,
  daysToExpiryMin,
  daysToExpiryMax,
  onExpiryChange,
  isLoading = false,
}: TodoExpiryFilterProps) {
  const t = useTranslations('todos')

  // Determine which presets to show based on active tab
  const presets =
    activeTab === 'expiring'
      ? EXPIRING_PRESETS
      : activeTab === 'expired'
        ? EXPIRED_PRESETS
        : GENERAL_PRESETS

  // Find current selected preset
  const currentPreset = presets.find(p => p.min === daysToExpiryMin && p.max === daysToExpiryMax)

  // Determine if filter is active
  const isActive = daysToExpiryMin !== undefined || daysToExpiryMax !== undefined

  // Get label based on tab
  const getFilterLabel = () => {
    if (activeTab === 'expiring') {
      return t('filters.expiry.expiringWithin')
    }
    if (activeTab === 'expired') {
      return t('filters.expiry.expiredInLast')
    }
    return t('filters.expiry.expiryRange')
  }

  const handlePresetSelect = (preset: (typeof presets)[0]) => {
    onExpiryChange({
      min: preset.min,
      max: preset.max,
    })
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onExpiryChange({ min: undefined, max: undefined })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isActive ? 'default' : 'outline'} disabled={isLoading}>
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">{getFilterLabel()}</span>
          {currentPreset && (
            <span
              className={cn(
                'ml-1 border border-gray-500 rounded-2xl px-2',
                isActive ? 'text-white' : 'text-gray-900',
              )}
            >
              {t(currentPreset.translationKey)}
            </span>
          )}
          {isActive ? (
            <X className="h-3 w-3 ml-1 hover:scale-110" onClick={handleClear} />
          ) : (
            <ChevronDown className="h-3 w-3 ml-1" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="p-2 space-y-1">
          {presets.map(preset => (
            <Button
              key={preset.value}
              variant={currentPreset?.value === preset.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handlePresetSelect(preset)}
              className="w-full justify-start"
            >
              {t(preset.translationKey)}
            </Button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
