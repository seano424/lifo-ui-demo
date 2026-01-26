'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Input } from '@/components/ui/input'
import { useBatchTodo } from '@/hooks/use-batch-todo'
import { useBatchActionRPC, isValidRecommendedAction } from '@/hooks/use-batch-actions-rpc'
import { useBatchActions } from '@/hooks/use-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'
import type { TodoItem } from '@/lib/queries/todos-rpc'
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
import { Typography } from '@/components/ui/typography'

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
      // Keep date string as-is since it's already in YYYY-MM-DD format
      expiry_date: currentBatch.expiry_date || '',
      cost_price: currentBatch.cost_price || 0,
      selling_price: currentBatch.selling_price || 0,
    })
    setIsEditingDetails(true)
  }

  const handleSaveDetails = async () => {
    try {
      updateBatch({
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
      <BottomSheet
        variant="fullHeight"
        isOpen={isOpen}
        onClose={onClose}
        titleElement={
          <div className="flex flex-col gap-2 lg:p-4">
            <Typography className="font-black" variant="h3">
              {currentBatch.product_name}
            </Typography>

            <div className="flex items-center divide-x divide-muted-foreground/10 font-bold">
              <Typography variant="muted" color="destructive" className="pr-2">
                {getExpiryContext()}
              </Typography>
              <Typography variant="muted" className="px-2">
                {currentBatch.current_quantity} units
              </Typography>
              <Typography variant="muted" className="pl-2">
                {currencySymbol} {atRiskValue}
              </Typography>
            </div>
          </div>
        }
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 pb-80">
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
            <div className="flex flex-col gap-4 pt-4">
              <CollapsibleSection
                title="Batch details"
                defaultOpen={false}
                action={
                  !isEditingDetails ? (
                    <button
                      type="button"
                      onClick={handleEditDetails}
                      className="bg-white px-6 py-3 rounded-3xl flex items-center gap-2"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="bg-muted-foreground/5 px-6 py-3 rounded-3xl flex items-center gap-2"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveDetails}
                        disabled={isUpdating}
                        className="bg-white px-6 py-3 rounded-3xl flex items-center gap-2"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>
                  )
                }
              >
                <div className="flex flex-col divide-y divide-muted-foreground/10 px-3">
                  {isEditingDetails ? (
                    <>
                      <div className="flex flex-col gap-2 py-4">
                        <Typography variant="small" className="px-3">
                          Expiry date
                        </Typography>
                        <Input
                          type="date"
                          value={editedValues.expiry_date}
                          onChange={e =>
                            setEditedValues(prev => ({
                              ...prev,
                              expiry_date: e.target.value,
                            }))
                          }
                          className="w-full h-9 rounded-3xl border-muted-foreground/10"
                        />
                      </div>
                      <div className="flex flex-col gap-2 py-4">
                        <Typography variant="small" className="px-3">
                          Cost price
                        </Typography>
                        <Input
                          type="number"
                          value={editedValues.cost_price}
                          onChange={e =>
                            setEditedValues(prev => ({
                              ...prev,
                              cost_price: Number(e.target.value),
                            }))
                          }
                          className="w-full h-9 rounded-3xl border-muted-foreground/10"
                        />
                      </div>
                      <div className="flex flex-col gap-2 py-4">
                        <Typography variant="small" className="px-3">
                          Selling price
                        </Typography>
                        <Input
                          type="number"
                          value={editedValues.selling_price}
                          onChange={e =>
                            setEditedValues(prev => ({
                              ...prev,
                              selling_price: Number(e.target.value),
                            }))
                          }
                          className="w-full h-9 rounded-3xl border-muted-foreground/10"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center py-4">
                        <Typography variant="small">Product</Typography>
                        <Typography variant="small">{currentBatch.product_name}</Typography>
                      </div>
                      <div className="flex justify-between items-center py-4">
                        <Typography variant="small">Batch number</Typography>
                        <Typography variant="small">{currentBatch.batch_number}</Typography>
                      </div>
                      <div className="flex justify-between items-center py-4">
                        <Typography variant="small">Expiry date</Typography>
                        <Typography variant="small">
                          {formatDate(currentBatch.expiry_date || '')}
                        </Typography>
                      </div>
                      <div className="flex justify-between items-center py-4">
                        <Typography variant="small">Cost price</Typography>
                        <Typography variant="small">
                          {formatCurrency(currentBatch.cost_price || 0)}
                        </Typography>
                      </div>
                      <div className="flex justify-between items-center py-4">
                        <Typography variant="small">Selling price</Typography>
                        <Typography variant="small">
                          {formatCurrency(currentBatch.selling_price || 0)}
                        </Typography>
                      </div>
                      <div className="flex justify-between items-center py-4">
                        <Typography variant="small">Initial quantity</Typography>
                        <Typography variant="small">
                          {(currentBatch.last_action_quantity || 0) +
                            (currentBatch.current_quantity || 0)}
                        </Typography>
                      </div>
                      <div className="flex justify-between items-center py-4">
                        <Typography variant="small">Current quantity</Typography>
                        <Typography variant="small">
                          {currentBatch.current_quantity || 0}
                        </Typography>
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="History" defaultOpen={false}>
                <div className="flex flex-col divide-y divide-muted-foreground/10 px-3">
                  {currentBatch.last_action_type ? (
                    <>
                      <div className="flex justify-between items-center py-4">
                        <Typography variant="small">Last action</Typography>
                        <Typography variant="small" className="capitalize">
                          {currentBatch.last_action_type.replace('_', ' ')}
                        </Typography>
                      </div>
                      {currentBatch.last_action_quantity && (
                        <div className="flex justify-between items-center py-4 w-full">
                          <Typography variant="small">Quantity left</Typography>
                          <Typography variant="small">
                            {currentBatch.current_quantity || 0}
                          </Typography>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-4">
                        {(currentBatch.total_sold_quantity || 0) > 0 && (
                          <div className="flex justify-between items-center w-full">
                            <Typography variant="small">Total sold</Typography>
                            <Typography variant="small">
                              {currentBatch.total_sold_quantity}
                            </Typography>
                          </div>
                        )}
                        {(currentBatch.total_discounted_quantity || 0) > 0 && (
                          <div className="flex justify-between items-center py-4">
                            <Typography variant="small">Total discounted</Typography>
                            <Typography variant="small">
                              {currentBatch.total_discounted_quantity}
                            </Typography>
                          </div>
                        )}
                        {(currentBatch.total_donated_quantity || 0) > 0 && (
                          <div className="flex justify-between items-center py-4">
                            <Typography variant="small">Total donated</Typography>
                            <Typography variant="small">
                              {currentBatch.total_donated_quantity}
                            </Typography>
                          </div>
                        )}
                        {(currentBatch.total_disposed_quantity || 0) > 0 && (
                          <div className="flex justify-between items-center py-4 w-full">
                            <Typography variant="small">Total disposed</Typography>
                            <Typography variant="small">
                              {currentBatch.total_disposed_quantity}
                            </Typography>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <Typography variant="small" className="text-center">
                      No actions yet
                    </Typography>
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
