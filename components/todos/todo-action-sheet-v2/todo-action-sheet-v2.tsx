'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBatchTodo } from '@/hooks/use-batch-todo'
import { useBatchActionRPC, isValidRecommendedAction } from '@/hooks/use-batch-actions-rpc'
import { useBatchActions } from '@/hooks/use-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { cn } from '@/lib/utils'
import { Edit3, Save, TagIcon, PercentIcon, PackageOpenIcon, PackageXIcon, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ActionButton } from './components/action-button'
import { ActionForm } from './components/action-form'
import { CollapsibleSection } from './components/collapsible-section'
import { SuccessToast } from './components/success-toast'
import { SellForm } from './forms/sell-form'
import { DiscountForm } from './forms/discount-form'
import { DonateForm } from './forms/donate-form'
import { DisposeForm } from './forms/dispose-form'
import type { Database } from '@/types/supabase'

interface TodoActionSheetV2Props {
  isOpen: boolean
  onClose: () => void
  selectedBatch: TodoItem | null
  currencySymbol?: string
}

type ActionType = 'sell' | 'discount' | 'donate' | 'dispose' | null

export function TodoActionSheetV2({
  isOpen,
  onClose,
  selectedBatch,
  currencySymbol = '€',
}: TodoActionSheetV2Props) {
  const activeStoreId = useActiveStoreId()

  // State
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch fresh batch data
  const { data: freshBatchData } = useBatchTodo(selectedBatch?.batch_id || null)
  const currentBatch = freshBatchData || selectedBatch

  // Hooks for actions
  const { executeSold, executeDiscount, executeDonate, executeDispose, isProcessing } =
    useBatchActionRPC(activeStoreId || undefined)
  const { updateBatch, isUpdating } = useBatchActions()

  // Edit form state
  const [editedValues, setEditedValues] = useState({
    expiry_date: '',
    cost_price: 0,
    selling_price: 0,
  })

  if (!currentBatch) {
    return null
  }

  // Calculate days to expiry
  const calculateDaysToExpiry = () => {
    const today = new Date()
    const expiryDate = new Date(currentBatch.expiry_date || '')
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysToExpiry = calculateDaysToExpiry()
  const isExpired = daysToExpiry < 0

  // Format expiry context
  const getExpiryContext = () => {
    if (isExpired) {
      return `Expired ${Math.abs(daysToExpiry)} days ago`
    }
    if (daysToExpiry === 0) {
      return 'Expires today'
    }
    if (daysToExpiry === 1) {
      return 'Expires tomorrow'
    }
    return `${daysToExpiry} days until expiry`
  }

  const atRiskValue = (
    (currentBatch.current_quantity || 0) * (currentBatch.unit_price || 0)
  ).toFixed(2)

  // Determine suggested action based on AI recommendation
  // const getSuggestedAction = (): ActionType => {
  //   const recommendation = currentBatch.ai_recommendation?.toLowerCase() || ''
  //   if (recommendation.includes('discount')) return 'discount'
  //   if (recommendation.includes('donate')) return 'donate'
  //   if (recommendation.includes('dispose')) return 'dispose'
  //   if (recommendation.includes('sell') || recommendation.includes('sold'))
  //     return 'sell'
  //   return null
  // }

  // const suggestedAction = getSuggestedAction()

  // Action handlers
  const handleActionClick = (action: ActionType) => {
    if (activeAction === action) {
      setActiveAction(null)
    } else {
      setActiveAction(action)
    }
  }

  const handleSellConfirm = async (quantity: number, timing: string) => {
    try {
      const params = {
        batchId: currentBatch.batch_id || '',
        quantity,
        saleTiming: timing,
        notes: `Marked ${quantity} units as sold (${timing})`,
        recommendedAction: isValidRecommendedAction(currentBatch.ai_recommendation)
          ? currentBatch.ai_recommendation
          : undefined,
      }

      await executeSold(params)

      setSuccessMessage(`Sold ${quantity} units`)
      setShowSuccess(true)
      setActiveAction(null)

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Sell action failed:', error)
      toast.error('Failed to mark as sold')
    }
  }

  const handleDiscountConfirm = async (
    quantity: number,
    discountPercentage: number,
    _printLabels: boolean,
  ) => {
    try {
      const params = {
        batchId: currentBatch.batch_id || '',
        quantity,
        discountPercentage,
        notes: `Applied ${discountPercentage}% discount`,
        recommendedAction: isValidRecommendedAction(currentBatch.ai_recommendation)
          ? currentBatch.ai_recommendation
          : undefined,
      }

      await executeDiscount(params)

      setSuccessMessage(`Applied ${discountPercentage}% discount`)
      setShowSuccess(true)
      setActiveAction(null)

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Discount action failed:', error)
      toast.error('Failed to apply discount')
    }
  }

  const handleDonateConfirm = async (
    quantity: number,
    recipientId: string,
    recipientName: string,
  ) => {
    try {
      const params = {
        batchId: currentBatch.batch_id || '',
        quantity,
        donationRecipientId: recipientId,
        notes: `Donated ${quantity} units to ${recipientName}`,
        recommendedAction: isValidRecommendedAction(currentBatch.ai_recommendation)
          ? currentBatch.ai_recommendation
          : undefined,
      }

      await executeDonate(params)

      setSuccessMessage(`Donated ${quantity} units`)
      setShowSuccess(true)
      setActiveAction(null)

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Donate action failed:', error)
      toast.error('Failed to donate')
    }
  }

  const handleDisposeConfirm = async (quantity: number, reason: string) => {
    try {
      const params = {
        batchId: currentBatch.batch_id || '',
        quantity,
        disposalReason: reason,
        notes: `Disposed ${quantity} units (${reason})`,
        recommendedAction: isValidRecommendedAction(currentBatch.ai_recommendation)
          ? currentBatch.ai_recommendation
          : undefined,
      }

      await executeDispose(params)

      setSuccessMessage(`Disposed ${quantity} units`)
      setShowSuccess(true)
      setActiveAction(null)

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Dispose action failed:', error)
      toast.error('Failed to dispose')
    }
  }

  const handleEditDetails = () => {
    setEditedValues({
      expiry_date: currentBatch.expiry_date
        ? new Date(currentBatch.expiry_date).toISOString().split('T')[0]
        : '',
      cost_price: currentBatch.cost_price || 0,
      selling_price: currentBatch.selling_price || 0,
    })
    setIsEditingDetails(true)
  }

  const handleSaveDetails = async () => {
    try {
      await updateBatch({
        batchId: currentBatch.batch_id || '',
        updates: {
          expiry_date: editedValues.expiry_date,
          cost_price: editedValues.cost_price,
          selling_price: editedValues.selling_price,
        } as Database['inventory']['Tables']['batches']['Update'],
      })
      setIsEditingDetails(false)
      toast.success('Batch details updated')
    } catch (error) {
      console.error('Failed to update batch:', error)
      toast.error('Failed to update batch details')
    }
  }

  const handleCancelEdit = () => {
    setIsEditingDetails(false)
  }

  const formatCurrency = (value: number) => `${currencySymbol}${value.toFixed(2)}`
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      <BottomSheet variant="fullHeight" isOpen={isOpen} onClose={onClose}>
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-[rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-[22px] font-semibold text-black leading-tight">
                {currentBatch.product_name}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-[rgba(0,0,0,0.04)] rounded-full transition-all"
              >
                <X className="h-5 w-5 text-[#86868b]" />
              </button>
            </div>
            <p className="text-sm text-[#86868b]">
              <span className={cn(isExpired && 'text-[#FF3B30]')}>{getExpiryContext()}</span>
              {' · '}
              {currentBatch.current_quantity} units
              {' · '}
              {currencySymbol}
              {atRiskValue} at risk
            </p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <ActionButton
                icon={TagIcon}
                label="Sell"
                isActive={activeAction === 'sell'}
                // isSuggested={suggestedAction === 'sell'}
                onClick={() => handleActionClick('sell')}
              />
              <ActionButton
                icon={PercentIcon}
                label="Discount"
                isActive={activeAction === 'discount'}
                // isSuggested={suggestedAction === 'discount'}
                onClick={() => handleActionClick('discount')}
              />
              <ActionButton
                icon={PackageOpenIcon}
                label="Donate"
                isActive={activeAction === 'donate'}
                // isSuggested={suggestedAction === 'donate'}
                onClick={() => handleActionClick('donate')}
              />
              <ActionButton
                icon={PackageXIcon}
                label="Dispose"
                isActive={activeAction === 'dispose'}
                // isSuggested={suggestedAction === 'dispose'}
                onClick={() => handleActionClick('dispose')}
              />
            </div>

            {/* Action Forms */}
            <ActionForm isOpen={activeAction === 'sell'}>
              <SellForm
                batch={currentBatch}
                currencySymbol={currencySymbol}
                isLoading={isProcessing}
                onConfirm={handleSellConfirm}
              />
            </ActionForm>

            <ActionForm isOpen={activeAction === 'discount'}>
              <DiscountForm
                batch={currentBatch}
                currencySymbol={currencySymbol}
                isLoading={isProcessing}
                onConfirm={handleDiscountConfirm}
              />
            </ActionForm>

            <ActionForm isOpen={activeAction === 'donate'}>
              <DonateForm
                batch={currentBatch}
                isLoading={isProcessing}
                onConfirm={handleDonateConfirm}
              />
            </ActionForm>

            <ActionForm isOpen={activeAction === 'dispose'}>
              <DisposeForm
                batch={currentBatch}
                currencySymbol={currencySymbol}
                isLoading={isProcessing}
                onConfirm={handleDisposeConfirm}
              />
            </ActionForm>

            {/* Collapsible Sections */}
            <div className="mt-6 space-y-0 divide-y divide-[rgba(0,0,0,0.06)]">
              <CollapsibleSection
                title="Batch details"
                defaultOpen={false}
                action={
                  !isEditingDetails ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleEditDetails}
                      className="h-8 text-sm text-black"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="h-8 text-sm text-[#86868b]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveDetails}
                        disabled={isUpdating}
                        className="h-8 text-sm text-black"
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save
                      </Button>
                    </div>
                  )
                }
              >
                <div className="space-y-3">
                  {isEditingDetails ? (
                    <>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-[#86868b]">Expiry date</Label>
                        <Input
                          type="date"
                          value={editedValues.expiry_date}
                          onChange={e =>
                            setEditedValues(prev => ({
                              ...prev,
                              expiry_date: e.target.value,
                            }))
                          }
                          className="w-40 h-9 rounded-lg border-[rgba(0,0,0,0.06)]"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-[#86868b]">Cost price</Label>
                        <Input
                          type="number"
                          value={editedValues.cost_price}
                          onChange={e =>
                            setEditedValues(prev => ({
                              ...prev,
                              cost_price: Number(e.target.value),
                            }))
                          }
                          className="w-40 h-9 rounded-lg border-[rgba(0,0,0,0.06)]"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-[#86868b]">Selling price</Label>
                        <Input
                          type="number"
                          value={editedValues.selling_price}
                          onChange={e =>
                            setEditedValues(prev => ({
                              ...prev,
                              selling_price: Number(e.target.value),
                            }))
                          }
                          className="w-40 h-9 rounded-lg border-[rgba(0,0,0,0.06)]"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#86868b]">Batch number</span>
                        <span className="text-sm text-black">{currentBatch.batch_number}</span>
                      </div>
                      {currentBatch.product_brand && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#86868b]">Brand</span>
                          <span className="text-sm text-black">{currentBatch.product_brand}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#86868b]">Expiry date</span>
                        <span className="text-sm text-black">
                          {formatDate(currentBatch.expiry_date || '')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#86868b]">Cost price</span>
                        <span className="text-sm text-black">
                          {formatCurrency(currentBatch.cost_price || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#86868b]">Selling price</span>
                        <span className="text-sm text-black">
                          {formatCurrency(currentBatch.selling_price || 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="History" defaultOpen={false}>
                <div className="space-y-3">
                  {currentBatch.last_action_type ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#86868b]">Last action</span>
                        <span className="text-sm text-black capitalize">
                          {currentBatch.last_action_type.replace('_', ' ')}
                        </span>
                      </div>
                      {currentBatch.last_action_quantity && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#86868b]">Quantity</span>
                          <span className="text-sm text-black">
                            {currentBatch.last_action_quantity}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-[rgba(0,0,0,0.06)] pt-3 mt-3">
                        {(currentBatch.total_sold_quantity || 0) > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-[#86868b]">Total sold</span>
                            <span className="text-sm text-black">
                              {currentBatch.total_sold_quantity}
                            </span>
                          </div>
                        )}
                        {(currentBatch.total_discounted_quantity || 0) > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-[#86868b]">Total discounted</span>
                            <span className="text-sm text-black">
                              {currentBatch.total_discounted_quantity}
                            </span>
                          </div>
                        )}
                        {(currentBatch.total_donated_quantity || 0) > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-[#86868b]">Total donated</span>
                            <span className="text-sm text-black">
                              {currentBatch.total_donated_quantity}
                            </span>
                          </div>
                        )}
                        {(currentBatch.total_disposed_quantity || 0) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#86868b]">Total disposed</span>
                            <span className="text-sm text-black">
                              {currentBatch.total_disposed_quantity}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-[#86868b] text-center py-2">No actions yet</p>
                  )}
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </BottomSheet>

      <SuccessToast
        message={successMessage}
        show={showSuccess}
        onHide={() => setShowSuccess(false)}
      />
    </>
  )
}
