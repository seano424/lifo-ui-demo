'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { InputSlider } from '@/components/ui/input-slider'
import { useBatchActionRPC } from '@/hooks/use-batch-actions-rpc'
import type { ActionableBatch } from '@/hooks/use-scoring-analytics'
import { cn } from '@/lib/utils'

interface TodoActionBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedBatch: ActionableBatch | null
}

type TabType = 'donate' | 'discount' | 'sold' | 'dispose' | 'more'

export function TodoActionBottomSheet({
  isOpen,
  onClose,
  selectedBatch,
}: TodoActionBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('discount')
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true)
  const [confidence] = useState(87) // Default confidence level

  // Discount tab state
  const [discountPercentage, setDiscountPercentage] = useState(
    selectedBatch?.discount_percent || 21,
  )
  const [_selectedPreset, setSelectedPreset] = useState(selectedBatch?.discount_percent || 21)
  const [customPrice, setCustomPrice] = useState<string>('')
  const [useCustomPrice, setUseCustomPrice] = useState(false)

  // Donate tab state
  const [selectedRecipient, setSelectedRecipient] = useState('local-foodbank')
  const [donateQuantity, setDonateQuantity] = useState(selectedBatch?.current_quantity || 0)
  const [isSelectAll, setIsSelectAll] = useState(true)

  const {
    executeDonate,
    executeDiscount,
    executeSold,
    executeDispose,
    executeDismiss,
    isProcessing,
  } = useBatchActionRPC()

  // Update donate state when selectedBatch changes
  useEffect(() => {
    if (selectedBatch) {
      setDonateQuantity(selectedBatch.current_quantity)
      setIsSelectAll(true)
    }
  }, [selectedBatch])

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

  // Calculate price and revenue metrics
  const calculatePriceMetrics = () => {
    const originalPricePerUnit = selectedBatch.potential_loss / selectedBatch.current_quantity

    // Use custom price if enabled and valid, otherwise use percentage discount
    let newPricePerUnit: number
    let actualDiscountPercentage: number

    if (useCustomPrice && customPrice) {
      const parsedPrice = parseFloat(customPrice)
      if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
        newPricePerUnit = parsedPrice
        actualDiscountPercentage = Math.round(
          ((originalPricePerUnit - parsedPrice) / originalPricePerUnit) * 100,
        )
      } else {
        // Fallback to percentage if custom price is invalid
        newPricePerUnit = originalPricePerUnit * (1 - discountPercentage / 100)
        actualDiscountPercentage = discountPercentage
      }
    } else {
      newPricePerUnit = originalPricePerUnit * (1 - discountPercentage / 100)
      actualDiscountPercentage = discountPercentage
    }

    const totalRevenueRecovery = newPricePerUnit * selectedBatch.current_quantity
    const recoveryPercentage = Math.round(
      (totalRevenueRecovery / selectedBatch.potential_loss) * 100,
    )

    return {
      originalPrice: originalPricePerUnit,
      newPrice: newPricePerUnit,
      totalRevenue: totalRevenueRecovery,
      recoveryPercentage,
      actualDiscountPercentage,
    }
  }

  // Get sell likelihood based on discount percentage
  const getSellLikelihood = (discount: number) => {
    if (discount >= 50) return 95
    if (discount >= 30) return 90
    if (discount >= 20) return 85
    if (discount >= 10) return 70
    return 25
  }

  // Calculate donation impact metrics
  const calculateDonationImpact = () => {
    const avgWeightPerUnit = 0.6 // Assume ~600g per unit average
    const totalWeight = donateQuantity * avgWeightPerUnit
    const mealsEstimate = Math.round(donateQuantity * 1.5) // 1.5 meals per unit estimate
    const taxBenefitRate = 0.6 // €0.60 per unit donated (tax deduction estimate)
    const taxBenefit = donateQuantity * taxBenefitRate

    return {
      preventedWaste: totalWeight,
      communityImpact: mealsEstimate,
      taxBenefit,
      donatedValue: selectedBatch
        ? (selectedBatch.potential_loss / selectedBatch.current_quantity) * donateQuantity
        : 0,
    }
  }

  const priceMetrics = calculatePriceMetrics()
  const sellLikelihood = getSellLikelihood(priceMetrics.actualDiscountPercentage)
  const donationImpact = calculateDonationImpact()

  // Helper function to get recipient display name
  const getRecipientName = (recipientId: string) => {
    switch (recipientId) {
      case 'local-foodbank':
        return 'Local Food Bank'
      case 'soup-kitchen':
        return 'Soup Kitchen'
      default:
        return 'Selected Recipient'
    }
  }

  // Get action button text based on active tab
  const getActionButtonText = () => {
    switch (activeTab) {
      case 'donate':
        return 'Mark as Donated'
      case 'discount':
        return useCustomPrice && customPrice
          ? `Set Price €${priceMetrics.newPrice.toFixed(2)}`
          : `Apply ${priceMetrics.actualDiscountPercentage}% Discount`
      case 'sold':
        return 'Mark as Sold'
      case 'dispose':
        return 'Mark as Disposed'
      case 'more':
        return 'Dismiss Alert'
      default:
        return 'Confirm Action'
    }
  }

  // Handle main action based on active tab
  const handleMainAction = async () => {
    try {
      switch (activeTab) {
        case 'donate':
          await executeDonate({
            batchId: selectedBatch.batch_id,
            quantity: donateQuantity,
            donationRecipientId: selectedRecipient,
            notes: `Donated ${donateQuantity} units to ${getRecipientName(selectedRecipient)} - ${selectedBatch.reason}`,
          })
          break
        case 'discount':
          await executeDiscount({
            batchId: selectedBatch.batch_id,
            quantity: selectedBatch.current_quantity,
            discountPercentage: priceMetrics.actualDiscountPercentage,
            notes: useCustomPrice
              ? `Set price to €${priceMetrics.newPrice.toFixed(2)} (${priceMetrics.actualDiscountPercentage}% discount) - ${selectedBatch.reason}`
              : `Applied ${priceMetrics.actualDiscountPercentage}% discount - ${selectedBatch.reason}`,
          })
          break
        case 'sold':
          await executeSold({
            batchId: selectedBatch.batch_id,
            quantity: selectedBatch.current_quantity,
            notes: 'Marked as sold from todos',
          })
          break
        case 'dispose':
          await executeDispose({
            batchId: selectedBatch.batch_id,
            quantity: selectedBatch.current_quantity,
            disposalReason: 'expired',
            notes: 'Disposed due to expiry',
          })
          break
        case 'more':
          await executeDismiss({
            batchId: selectedBatch.batch_id,
            dismissalReason: 'not_applicable',
            notes: 'Dismissed recommendation from todos',
          })
          break
      }
      onClose()
    } catch (error) {
      console.error(`${activeTab} action failed:`, error)
    }
  }

  // Tab configuration
  const tabs = [
    { id: 'donate' as TabType, label: 'Donate', icon: '🎯' },
    { id: 'discount' as TabType, label: 'Discount', icon: '💰' },
    { id: 'sold' as TabType, label: 'Sold', icon: '✅' },
    { id: 'dispose' as TabType, label: 'Dispose', icon: '🗑️' },
    { id: 'more' as TabType, label: 'More', icon: '👁️' },
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
        <div className="flex-1">
          <div className="min-h-[280px] max-h-[400px] overflow-y-auto py-6 px-6">
            {activeTab === 'discount' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-lg">💡</span>
                    <h3 className="font-semibold text-lg">MAXIMIZE REVENUE RECOVERY</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI Suggested Discount: {selectedBatch.discount_percent || 21}%
                  </p>
                </div>

                {/* Price Comparison Box */}
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Original:</span>
                      <span className="ml-2 font-semibold">
                        €{priceMetrics.originalPrice.toFixed(2)}
                      </span>
                      <span className="mx-3 text-muted-foreground">→</span>
                      <span className="text-muted-foreground">New:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        €{priceMetrics.newPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Revenue recovery:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      €{priceMetrics.totalRevenue.toFixed(2)} ({priceMetrics.recoveryPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Discount Slider */}
                <InputSlider
                  value={discountPercentage}
                  onChange={value => {
                    setDiscountPercentage(value)
                    setUseCustomPrice(false)
                    setCustomPrice('')
                  }}
                  min={5}
                  max={70}
                  step={1}
                  label="Adjust discount:"
                  suffix="%"
                  sliderColor="#8b5cf6"
                />

                {/* Custom Price Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Or set specific price:</label>
                    <button
                      type="button"
                      onClick={() => setUseCustomPrice(!useCustomPrice)}
                      className={cn(
                        'px-2 py-1 text-xs rounded border transition-all',
                        useCustomPrice
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      {useCustomPrice ? 'Using Price' : 'Use Price'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={priceMetrics.newPrice.toFixed(2)}
                      value={customPrice}
                      onChange={e => setCustomPrice(e.target.value)}
                      disabled={!useCustomPrice}
                      className={cn(
                        'flex-1 px-3 py-2 text-sm border rounded-md transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                        useCustomPrice
                          ? 'bg-background border-border'
                          : 'bg-muted border-muted text-muted-foreground cursor-not-allowed',
                      )}
                    />
                    <span className="text-xs text-muted-foreground">per unit</span>
                  </div>

                  {useCustomPrice && customPrice && (
                    <div className="text-xs text-muted-foreground">
                      This equals a {priceMetrics.actualDiscountPercentage}% discount
                    </div>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quick presets:</label>
                  <div className="flex gap-2">
                    {[10, 20, 25, 50].map(preset => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => {
                          setDiscountPercentage(preset)
                          setSelectedPreset(preset)
                          setUseCustomPrice(false)
                          setCustomPrice('')
                        }}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-md border transition-all',
                          discountPercentage === preset
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary/50',
                        )}
                      >
                        {preset === 21 && discountPercentage === preset ? '✓ ' : ''}
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expected Outcome */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected outcome:</label>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>•</span>
                      <span>{sellLikelihood}% likely to sell within 2 days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>•</span>
                      <span>vs 23% at full price</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'donate' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-lg">✨</span>
                    <h3 className="font-semibold text-lg">PREVENT FOOD WASTE</h3>
                  </div>
                </div>

                {/* Donation Impact Box */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div className="font-medium text-green-800 mb-2">Donation Impact:</div>
                    <div className="text-green-700">
                      • {donateQuantity} units = ~{donationImpact.preventedWaste.toFixed(1)}kg
                      prevented waste
                    </div>
                    <div className="text-green-700">
                      • Tax benefit: ~€{donationImpact.taxBenefit.toFixed(2)}
                    </div>
                    <div className="text-green-700">
                      • Community impact: ~{donationImpact.communityImpact} meals
                    </div>
                  </div>
                </div>

                {/* Recipient Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Select recipient:</label>
                  <div className="space-y-2">
                    {/* Local Food Bank */}
                    <button
                      type="button"
                      onClick={() => setSelectedRecipient('local-foodbank')}
                      className={cn(
                        'w-full p-3 text-left rounded-lg border transition-all',
                        'flex items-center justify-between',
                        selectedRecipient === 'local-foodbank'
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🏠</span>
                        <span className="font-medium">Local Food Bank</span>
                      </div>
                      {selectedRecipient === 'local-foodbank' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <span className="text-xs font-medium">SELECTED</span>
                          <span>✓</span>
                        </div>
                      )}
                    </button>

                    {/* Soup Kitchen */}
                    <button
                      type="button"
                      onClick={() => setSelectedRecipient('soup-kitchen')}
                      className={cn(
                        'w-full p-3 text-left rounded-lg border transition-all',
                        'flex items-center justify-between',
                        selectedRecipient === 'soup-kitchen'
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🍽️</span>
                        <span className="font-medium">Soup Kitchen</span>
                      </div>
                      {selectedRecipient === 'soup-kitchen' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <span className="text-xs font-medium">SELECTED</span>
                          <span>✓</span>
                        </div>
                      )}
                    </button>

                    {/* Add New Recipient - Future functionality */}
                    <button
                      type="button"
                      className="w-full p-3 text-left rounded-lg border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
                      disabled
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">➕</span>
                        <span>Add new recipient</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quantity Selection */}
                <div className="space-y-3">
                  <InputSlider
                    value={donateQuantity}
                    onChange={value => {
                      setDonateQuantity(value)
                      setIsSelectAll(value === selectedBatch?.current_quantity)
                    }}
                    min={1}
                    max={selectedBatch?.current_quantity || 1}
                    step={1}
                    label="Quantity to donate:"
                    suffix={`/${selectedBatch?.current_quantity}`}
                    sliderColor="#22c55e"
                  />

                  {/* Select All Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setDonateQuantity(selectedBatch?.current_quantity || 0)
                        setIsSelectAll(true)
                      }}
                      className={cn(
                        'px-4 py-2 text-sm rounded-md border transition-all',
                        isSelectAll
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-background border-border hover:border-green-500 hover:text-green-600',
                      )}
                    >
                      SELECT ALL
                    </button>
                  </div>
                </div>

                {/* Urgency Warning if applicable */}
                {selectedBatch &&
                  new Date(selectedBatch.expiry_date).getTime() - Date.now() <
                    24 * 60 * 60 * 1000 && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700">
                        <span>⚠️</span>
                        <span className="text-sm font-medium">
                          {calculateDaysLeft()} - Act quickly!
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {activeTab === 'sold' && (
              <div className="text-center">
                <p className="text-lg">Mark as sold content coming in Phase 4</p>
              </div>
            )}

            {activeTab === 'dispose' && (
              <div className="text-center">
                <p className="text-lg">Dispose content coming in Phase 5</p>
              </div>
            )}

            {activeTab === 'more' && (
              <div className="text-center">
                <p className="text-lg">Additional options</p>
                <p className="text-sm mt-2">Dismiss this recommendation</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="border-t pt-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button onClick={handleMainAction} disabled={isProcessing} className="min-w-[140px]">
              {isProcessing ? 'Processing...' : getActionButtonText()}
            </Button>

            {/* Confidence Indicator */}
            <div className="text-xs text-muted-foreground">Confidence: {confidence}%</div>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
