'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import type { ActionableBatch } from '@/hooks/use-scoring-analytics'
import { cn } from '@/lib/utils'
import { DiscountTab } from './tabs/discount-tab'
import { DisposeTab } from './tabs/dispose-tab'
import { DonateTab } from './tabs/donate-tab'
import { SoldTab } from './tabs/sold-tab'

interface TodoActionBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedBatch: ActionableBatch | null
}

type TabType = 'donate' | 'discount' | 'sold' | 'dispose'

export function TodoActionBottomSheet({
  isOpen,
  onClose,
  selectedBatch,
}: TodoActionBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('discount')
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true)

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

  // Get urgency color
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'text-red-600'
      case 'high':
        return 'text-orange-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  // All calculations and actions are now handled in individual tab components

  // Tab configuration
  const tabs = [
    { id: 'donate' as TabType, label: 'Donate', icon: '🎯' },
    { id: 'discount' as TabType, label: 'Discount', icon: '💰' },
    { id: 'sold' as TabType, label: 'Sold', icon: '✅' },
    { id: 'dispose' as TabType, label: 'Dispose', icon: '🗑️' },
  ]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="" variant="fullHeight">
      <div className="flex flex-col h-full -mt-4">
        {/* Custom Header with Hide/Show Toggle */}
        <div className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">
                  {selectedBatch.product_name} - Batch #
                  {selectedBatch.batch_id.slice(0, 8).toUpperCase()}
                </h2>
              </div>

              {isHeaderExpanded && (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-4">
                    <span className={cn('font-medium', getUrgencyColor(selectedBatch.urgency))}>
                      {calculateDaysLeft()}
                    </span>
                    <span>• {selectedBatch.current_quantity} units</span>
                    <span className={cn('capitalize', getUrgencyColor(selectedBatch.urgency))}>
                      • {selectedBatch.urgency} urgency
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <p className="font-medium">Suggestion: {selectedBatch.recommendation}</p>
                    <p className="text-xs mt-1">{selectedBatch.reason}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {isHeaderExpanded ? (
                <div className="flex items-center gap-1 text-xs">
                  <ChevronUp className="h-4 w-4" />
                  HIDE
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs">
                  <ChevronDown className="h-4 w-4" />
                  SHOW
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-3 px-2 text-sm font-medium transition-all',
                'border-b-2 -mb-[2px]',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="mr-1">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
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
