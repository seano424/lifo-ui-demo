'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useBatchTodo } from '@/hooks/use-batch-todo'
import { DiscountTab } from './todos-dialog-tabs/discount-tab'
import { DisposeTab } from './todos-dialog-tabs/dispose-tab'
import { DonateTab } from './todos-dialog-tabs/donate-tab'
import { DetailsTab } from './todos-dialog-tabs/details-tab'
import { SoldTab } from './todos-dialog-tabs/sold-tab'
import { Typography } from '../ui/typography'

import {
  PercentIcon,
  PackageOpenIcon,
  TagIcon,
  PackageXIcon,
  SparklesIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  ClockIcon,
} from 'lucide-react'

interface TodoActionBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedBatch: TodoItem | null
}

type TabType = 'donate' | 'discount' | 'sold' | 'dispose' | 'details'

export function TodoActionBottomSheet({
  isOpen,
  onClose,
  selectedBatch,
}: TodoActionBottomSheetProps) {
  const t = useTranslations('todos')
  const [activeTab, setActiveTab] = useState<TabType>('details')

  // Fetch fresh batch data to ensure UI stays in sync
  const { data: freshBatchData } = useBatchTodo(selectedBatch?.batch_id || null)

  // Use fresh data if available, fallback to selectedBatch
  const currentBatch = freshBatchData || selectedBatch

  if (!currentBatch) {
    return null
  }

  // Calculate days until expiry
  const calculateDaysLeft = () => {
    const today = new Date()
    const expiryDate = new Date(currentBatch.expiry_date || '')
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t('card.expiresToday')
    if (diffDays === 1) return t('card.daysLeftOne')
    if (diffDays < 0) return t('card.expired', { days: Math.abs(diffDays) })
    return t('card.daysLeft', { days: diffDays })
  }

  // Get status badge configuration
  const getStatusConfig = () => {
    const status = currentBatch.completion_status || 'pending'
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle2Icon,
          label: t('completionStatus.completed'),
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        }
      case 'in_progress':
        return {
          icon: ClockIcon,
          label: t('completionStatus.in_progress'),
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        }
      default:
        return {
          icon: CircleDashedIcon,
          label: t('completionStatus.pending'),
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  // Tab configuration
  const tabs = [
    {
      id: 'details' as TabType,
      label: t('actions.details'),
      icon: SparklesIcon,
    },
    {
      id: 'discount' as TabType,
      label: t('actions.discount'),
      icon: PercentIcon,
    },
    {
      id: 'donate' as TabType,
      label: t('actions.donate'),
      icon: PackageOpenIcon,
    },
    { id: 'sold' as TabType, label: t('actions.sell'), icon: TagIcon },
    {
      id: 'dispose' as TabType,
      label: t('actions.dispose'),
      icon: PackageXIcon,
    },
  ]

  return (
    <BottomSheet
      variant="fullHeight"
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 overflow-hidden">
              <div className="truncate">
                <Typography className="leading-normal" variant="h4">
                  {currentBatch.product_name || ''}
                </Typography>
              </div>
            </div>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0',
                statusConfig.className,
              )}
            >
              <StatusIcon className="size-3.5" />
              <span>{statusConfig.label}</span>
            </div>
          </div>
          <div className="flex flex-row sm:items-center divide-x">
            <div className="divide-x flex">
              <Typography className="pr-2 text-xs sm:text-base">
                {new Date(currentBatch.expiry_date || '').toLocaleDateString()}
              </Typography>
              <Typography className="px-2 text-xs sm:text-base">{calculateDaysLeft()}</Typography>
            </div>
            <div className="divide-x flex">
              <Typography className="px-2 text-xs sm:text-base">
                {t('bottomSheet.units', {
                  count: currentBatch.current_quantity || 0,
                })}
              </Typography>
              <Typography className="px-2 text-xs sm:text-base">
                €{(currentBatch.unit_price || 0).toFixed(2)}
              </Typography>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'discount' && (
            <DiscountTab selectedBatch={currentBatch} onClose={onClose} />
          )}

          {activeTab === 'donate' && <DonateTab selectedBatch={currentBatch} onClose={onClose} />}

          {activeTab === 'sold' && <SoldTab selectedBatch={currentBatch} onClose={onClose} />}

          {activeTab === 'dispose' && <DisposeTab selectedBatch={currentBatch} onClose={onClose} />}

          {activeTab === 'details' && <DetailsTab selectedBatch={currentBatch} onClose={onClose} />}
        </div>

        {/* Tab Navigation */}
        <div className="flex w-full overflow-x-auto px-4 pb-8 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent  gap-1 justify-between pt-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'transition-all flex flex-col items-center gap-1 font-medium font-heading flex-1 text-xs sm:text-base hover:bg-opacity-0 flex-shrink-0 py-2 rounded-2xl',
                activeTab === tab.id &&
                  'text-primary bg-primary-50 dark:bg-brand-dark dark:text-secondary-600',
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
