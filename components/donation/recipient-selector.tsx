'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useDonationRecipients,
  ADHOC_PRESETS,
  type DonationRecipient,
  type CreateRecipientData,
} from '@/hooks/use-donation-recipients'
import { useTranslations } from 'next-intl'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

interface RecipientSelectorProps {
  storeId: string | undefined
  selectedRecipientId: string | undefined
  selectedRecipientName?: string // For ad-hoc recipients
  onRecipientSelect: (recipientId: string, recipientName: string) => void
  className?: string
}

/**
 * Shared component for selecting donation recipients
 *
 * Supports:
 * - Database recipients (permanent records) - shown at top
 * - Quick presets (Employee, Family & Friends, etc.) - ad-hoc, temporary
 * - Custom recipients form - creates permanent DB records with full details
 *
 * Used in:
 * - DonateTab (todos dialog)
 * - ScanOut interface (batch removal)
 *
 * @example
 * ```tsx
 * <RecipientSelector
 *   storeId={activeStoreId}
 *   selectedRecipientId={selectedRecipient}
 *   selectedRecipientName={selectedRecipientName}
 *   onRecipientSelect={(recipientId, recipientName) => {
 *     setSelectedRecipient(recipientId)
 *     setSelectedRecipientName(recipientName)
 *   }}
 * />
 * ```
 */
export function RecipientSelector({
  storeId,
  selectedRecipientId,
  selectedRecipientName,
  onRecipientSelect,
  className,
}: RecipientSelectorProps) {
  const t = useTranslations('donation')
  const tCommon = useTranslations()

  const {
    recipients,
    isLoading,
    addAdhocRecipient,
    createRecipient,
    isCreating,
    ADHOC_RECIPIENT_UUID,
  } = useDonationRecipients(storeId)

  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState<DonationRecipient['type']>('charity')
  const [customEmail, setCustomEmail] = useState('')
  const [customPhone, setCustomPhone] = useState('')

  // Log recipients whenever they change
  useEffect(() => {
    const dbRecipients = recipients.filter(r => !r.isAdhoc)
    const adhocRecipients = recipients.filter(r => r.isAdhoc)

    logger.log('RecipientSelector', 'Recipients updated', {
      storeId,
      totalCount: recipients.length,
      dbCount: dbRecipients.length,
      adhocCount: adhocRecipients.length,
      dbRecipientNames: dbRecipients.map(r => r.name),
      adhocRecipientNames: adhocRecipients.map(r => r.name),
    })
  }, [recipients, storeId])

  // Handle preset selection
  const handlePresetSelect = (presetName: string) => {
    addAdhocRecipient(presetName)
    onRecipientSelect(ADHOC_RECIPIENT_UUID, presetName)
    setShowCustomInput(false)
  }

  // Reset custom form
  const resetCustomForm = () => {
    setCustomName('')
    setCustomType('charity')
    setCustomEmail('')
    setCustomPhone('')
    setShowCustomInput(false)
  }

  // Handle custom recipient creation (saves to DB)
  const handleCustomSubmit = () => {
    if (!customName.trim()) {
      logger.warn('RecipientSelector', 'Submit blocked - name is empty')
      return
    }

    const recipientData: CreateRecipientData = {
      name: customName.trim(),
      type: customType,
      contactEmail: customEmail.trim() || undefined,
      contactPhone: customPhone.trim() || undefined,
    }

    logger.log('RecipientSelector', 'Submitting new recipient', {
      recipientData,
      storeId,
    })

    // Create permanent DB recipient
    // Note: The mutation's onSuccess in the hook handles query invalidation
    // We need to include BOTH the mutation's onSuccess AND our custom logic
    createRecipient(recipientData, {
      onSuccess: createdRecipient => {
        logger.log('RecipientSelector', 'Recipient created successfully (component callback)', {
          createdRecipient,
        })
        // Select the newly created recipient
        onRecipientSelect(createdRecipient.id, createdRecipient.name)
        resetCustomForm()
      },
      onError: error => {
        logger.error('RecipientSelector', 'Failed to create recipient (component callback)', {
          error,
          recipientData,
        })
      },
    })
  }

  // Handle DB recipient selection
  const handleRecipientSelect = (recipient: DonationRecipient) => {
    onRecipientSelect(recipient.id, recipient.name)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        <span className="ml-2 text-primary">
          {t('loadingRecipients') || 'Loading recipients...'}
        </span>
      </div>
    )
  }

  const dbRecipients = recipients.filter(r => !r.isAdhoc)
  // const adhocRecipientsList = recipients.filter((r) => r.isAdhoc)

  return (
    <div className={className}>
      {/* DB Recipients */}
      {dbRecipients.length > 0 && (
        <div className="flex flex-col gap-2">
          <Typography variant="small">{t('savedRecipients') || 'Saved Recipients'}</Typography>
          <div className="grid grid-cols-1 gap-2">
            {dbRecipients.map(recipient => (
              <button
                type="button"
                key={recipient.id}
                onClick={() => handleRecipientSelect(recipient)}
                className={cn(
                  'py-2 px-3 text-sm  rounded-3xl transition-all duration-500 ease-in-out flex items-center justify-center gap-2',
                  selectedRecipientId === recipient.id
                    ? 'bg-primary/10 text-black border-8 border-primary/10'
                    : 'bg-white text-black hover:bg-muted/50 border-8 border-transparent',
                )}
              >
                <div className="text-left flex-1 flex flex-col gap-1">
                  <Typography>{recipient.name}</Typography>
                  <Typography variant="extraSmall" className="text-muted-foreground capitalize">
                    {recipient.type.replace('_', ' ')}
                  </Typography>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Presets */}
      <div className={`flex flex-col gap-2 ${dbRecipients.length > 0 ? 'mt-4' : ''}`}>
        <Typography variant="small">{t('quickOptions') || 'Quick Options'}</Typography>
        <div className="grid grid-cols-2 gap-2">
          {ADHOC_PRESETS.map(preset => {
            const isSelected =
              selectedRecipientId === ADHOC_RECIPIENT_UUID && selectedRecipientName === preset.name
            return (
              <button
                type="button"
                key={preset.name}
                onClick={() => handlePresetSelect(preset.name)}
                className={cn(
                  'py-2 px-3 text-sm  rounded-3xl transition-all duration-500 ease-in-out flex items-center justify-center gap-2',
                  isSelected
                    ? 'bg-primary/10 text-black border-8 border-primary/10'
                    : 'bg-white text-black hover:bg-muted/50 border-8 border-transparent',
                )}
              >
                <Typography variant="small">{preset.name}</Typography>
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom Entry - Creates Permanent DB Recipient */}
      <div className="mt-4 flex flex-col gap-2">
        {!showCustomInput ? (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowCustomInput(true)}
            className="w-full justify-center gap-2 py-2 px-3 text-sm  rounded-3xl transition-all duration-500 ease-in-out flex items-center bg-white text-black hover:bg-muted/50 border-8 border-transparent"
          >
            <Plus className="h-4 w-4" />
            {t('addCustomRecipient') || 'Add New Recipient'}
          </Button>
        ) : (
          <div className="flex flex-col gap-3 p-4">
            <Typography variant="small">
              {t('newRecipientDetails') || 'New Recipient Details'}
            </Typography>

            {/* Name Field */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="custom-recipient">{t('recipientName') || 'Recipient Name'} *</Label>
              <Input
                id="custom-recipient"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder={t('customRecipientPlaceholder') || 'e.g., Local Food Bank'}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customName.trim()) handleCustomSubmit()
                  if (e.key === 'Escape') resetCustomForm()
                }}
                autoFocus
              />
            </div>

            {/* Type Selector */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="custom-type" className="text-xs">
                {t('recipientType') || 'Type'} *
              </Label>
              <Select
                value={customType}
                onValueChange={value => setCustomType(value as DonationRecipient['type'])}
              >
                <SelectTrigger id="custom-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="charity">{t('type.charity') || 'Charity'}</SelectItem>
                  <SelectItem value="food_bank">{t('type.foodBank') || 'Food Bank'}</SelectItem>
                  <SelectItem value="soup_kitchen">
                    {t('type.soupKitchen') || 'Soup Kitchen'}
                  </SelectItem>
                  <SelectItem value="religious_org">
                    {t('type.religiousOrg') || 'Religious Organization'}
                  </SelectItem>
                  <SelectItem value="community_group">
                    {t('type.communityGroup') || 'Community Group'}
                  </SelectItem>
                  <SelectItem value="animal_shelter">
                    {t('type.animalShelter') || 'Animal Shelter'}
                  </SelectItem>
                  <SelectItem value="school">{t('type.school') || 'School'}</SelectItem>
                  <SelectItem value="elderly_care">
                    {t('type.elderlyCare') || 'Elderly Care'}
                  </SelectItem>
                  <SelectItem value="homeless_shelter">
                    {t('type.homelessShelter') || 'Homeless Shelter'}
                  </SelectItem>
                  <SelectItem value="other">{t('type.other') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Email (Optional) */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="custom-email" className="text-xs">
                {t('contactEmail') || 'Contact Email'} ({tCommon('optional') || 'optional'})
              </Label>
              <Input
                id="custom-email"
                type="email"
                value={customEmail}
                onChange={e => setCustomEmail(e.target.value)}
                placeholder="contact@example.org"
              />
            </div>

            {/* Contact Phone (Optional) */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="custom-phone" className="text-xs">
                {t('contactPhone') || 'Contact Phone'} ({tCommon('optional') || 'optional'})
              </Label>
              <Input
                id="custom-phone"
                type="tel"
                value={customPhone}
                onChange={e => setCustomPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCustomSubmit}
                disabled={!customName.trim() || isCreating}
                className="flex-1 bg-muted text-black hover:bg-muted/90"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    {tCommon('saving') || 'Saving...'}
                  </>
                ) : (
                  tCommon('save') || 'Save'
                )}
              </Button>
              <Button variant="subtleSecondary" onClick={resetCustomForm} disabled={isCreating}>
                {tCommon('cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ad-hoc Recipients Already Added */}
      {/* {adhocRecipientsList.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          <Typography
            variant="small"
            className="text-sm"
          >
            {t('recentQuickOptions') || 'Recent Quick Options'}
          </Typography>
          <div className="grid grid-cols-1 gap-2">
            {adhocRecipientsList.map((recipient) => {
              const isSelected =
                selectedRecipientId === ADHOC_RECIPIENT_UUID &&
                selectedRecipientName === recipient.name
              return (
                <Button
                  key={recipient.name}
                  size="lg"
                  variant={isSelected ? 'subtleTertiary' : 'outline'}
                  onClick={() => handleRecipientSelect(recipient)}
                  className="border-none shadow justify-start"
                >
                  <span className="flex-1 text-left">{recipient.name}</span>
                  {isSelected && <Check className="h-4 w-4 ml-2" />}
                </Button>
              )
            })}
          </div>
        </div>
      )} */}
    </div>
  )
}
