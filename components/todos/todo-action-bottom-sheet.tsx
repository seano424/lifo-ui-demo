'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useBatchTodo } from '@/hooks/use-batch-todo'
import { DiscountTab } from './todos-dialog-tabs/discount-tab'
import { DisposeTab } from './todos-dialog-tabs/dispose-tab'
import { DonateTab } from './todos-dialog-tabs/donate-tab'
import { DetailsTab } from './todos-dialog-tabs/details-tab'
import { SoldTab } from './todos-dialog-tabs/sold-tab'
import { Typography } from '../ui/typography'

import { PercentIcon, PackageOpenIcon, TagIcon, PackageXIcon, SparklesIcon } from 'lucide-react'

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

    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return '1 day left'
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
    return `${diffDays} days left`
  }

  // Tab configuration
  const tabs = [
    { id: 'details' as TabType, label: 'Details', icon: SparklesIcon },
    { id: 'discount' as TabType, label: 'Discount', icon: PercentIcon },
    { id: 'donate' as TabType, label: 'Donate', icon: PackageOpenIcon },
    { id: 'sold' as TabType, label: 'Sell', icon: TagIcon },
    { id: 'dispose' as TabType, label: 'Dispose', icon: PackageXIcon },
  ]

  return (
    <BottomSheet
      variant="fullHeight"
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex flex-col gap-2 max-w-[280px] sm:max-w-max">
          <Typography className="leading-normal truncate" variant="h4">
            {currentBatch.product_name || ''}
          </Typography>
          <div className="flex flex-row sm:items-center divide-x">
            <div className="divide-x flex">
              <Typography className="pr-2 text-xs sm:text-base">
                {new Date(currentBatch.expiry_date || '').toLocaleDateString()}
              </Typography>
              <Typography className="px-2 text-xs sm:text-base">{calculateDaysLeft()}</Typography>
            </div>
            <div className="divide-x flex">
              <Typography className="px-2 text-xs sm:text-base">
                {currentBatch.current_quantity || 0} units
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
                'transition-all flex flex-col items-center gap-1 font-medium font-heading flex-1 text-xs sm:text-base hover:bg-opacity-0 flex-shrink-0 p-2 rounded-xl',
                activeTab === tab.id && 'text-primary bg-primary-50',
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
