'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import type { ActionableBatch } from '@/hooks/use-batch-actions-rpc'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { DiscountTab } from './todos-dialog-tabs/discount-tab'
import { DisposeTab } from './todos-dialog-tabs/dispose-tab'
import { DonateTab } from './todos-dialog-tabs/donate-tab'
import { SoldTab } from './todos-dialog-tabs/sold-tab'
import { Typography } from '../ui/typography'
import { Button } from '@/components/ui/button'

interface TodoActionBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedBatch: ActionableBatch | null
}

type TabType = 'donate' | 'discount' | 'sold' | 'dispose' | 'details'

export function TodoActionBottomSheet({
  isOpen,
  onClose,
  selectedBatch,
}: TodoActionBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('discount')

  if (!selectedBatch) {
    return null
  }

  // Calculate days until expiry
  const calculateDaysLeft = () => {
    const today = new Date()
    const expiryDate = new Date(selectedBatch.expiry_date)
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return '1 day left'
    if (diffDays < 0) return `Expired ${Math.abs(diffDays)} days ago`
    return `${diffDays} days left`
  }

  // Tab configuration
  const tabs = [
    { id: 'sold' as TabType, label: 'Mark as Sold', icon: '✅' },
    { id: 'discount' as TabType, label: 'Discount', icon: '💰' },
    { id: 'donate' as TabType, label: 'Donate', icon: '🎯' },
    { id: 'details' as TabType, label: 'More Details', icon: '🗑️' },
    { id: 'dispose' as TabType, label: 'Dispose', icon: '🗑️' },
  ]

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      contentBgMuted={true}
      titleElement={
        <div className="flex flex-col gap-4">
          <Typography variant="h4">{selectedBatch.product_name}</Typography>
          <div className="flex items-center divide-x divide-muted-foreground">
            <Typography className="pr-2">
              {new Date(selectedBatch.expiry_date).toLocaleDateString()}
            </Typography>
            <Typography className="px-2">{calculateDaysLeft()}</Typography>
            <Typography className="px-2">{selectedBatch.current_quantity} remaining</Typography>
          </div>
        </div>
      }
      variant="fullHeight"
    >
      <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="flex gap-4 w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className={cn('transition-all flex-shrink-0')}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'discount' && (
            <DiscountTab selectedBatch={selectedBatch} onClose={onClose} />
          )}

          {activeTab === 'donate' && <DonateTab selectedBatch={selectedBatch} onClose={onClose} />}

          {activeTab === 'sold' && <SoldTab selectedBatch={selectedBatch} onClose={onClose} />}

          {activeTab === 'dispose' && (
            <DisposeTab selectedBatch={selectedBatch} onClose={onClose} />
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
