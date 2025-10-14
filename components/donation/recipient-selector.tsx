'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import {
  useDonationRecipients,
  ADHOC_PRESETS,
  type DonationRecipient,
} from '@/hooks/use-donation-recipients'
import { useTranslations } from 'next-intl'

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
 * - Database recipients (permanent records)
 * - Quick presets (Employee, Family & Friends, etc.)
 * - Custom ad-hoc recipients (temporary entries)
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

  const { recipients, isLoading, addAdhocRecipient, ADHOC_RECIPIENT_UUID } =
    useDonationRecipients(storeId)

  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState('')

  // Handle preset selection
  const handlePresetSelect = (presetName: string) => {
    addAdhocRecipient(presetName)
    onRecipientSelect(ADHOC_RECIPIENT_UUID, presetName)
    setShowCustomInput(false)
  }

  // Handle custom name submission
  const handleCustomSubmit = () => {
    if (!customName.trim()) return

    addAdhocRecipient(customName)
    onRecipientSelect(ADHOC_RECIPIENT_UUID, customName)
    setCustomName('')
    setShowCustomInput(false)
  }

  // Handle DB recipient selection
  const handleRecipientSelect = (recipient: DonationRecipient) => {
    onRecipientSelect(recipient.id, recipient.name)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          {t('loadingRecipients') || 'Loading recipients...'}
        </span>
      </div>
    )
  }

  const dbRecipients = recipients.filter(r => !r.isAdhoc)
  const adhocRecipientsList = recipients.filter(r => r.isAdhoc)

  return (
    <div className={className}>
      {/* DB Recipients */}
      {dbRecipients.length > 0 && (
        <div className="space-y-2">
          <Typography variant="muted" className="text-sm">
            {t('savedRecipients') || 'Saved Recipients'}
          </Typography>
          <div className="grid grid-cols-1 gap-2">
            {dbRecipients.map(recipient => (
              <Button
                key={recipient.id}
                size="lg"
                variant={selectedRecipientId === recipient.id ? 'subtleTertiary' : 'outline'}
                onClick={() => handleRecipientSelect(recipient)}
                className="border-none shadow justify-start"
              >
                <div className="text-left flex-1">
                  <div className="font-medium">{recipient.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {recipient.type.replace('_', ' ')}
                  </div>
                </div>
                {selectedRecipientId === recipient.id && <Check className="h-4 w-4 ml-2" />}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Presets */}
      <div className={`space-y-2 ${dbRecipients.length > 0 ? 'mt-4' : ''}`}>
        <Typography variant="muted" className="text-sm">
          {t('quickOptions') || 'Quick Options'}
        </Typography>
        <div className="grid grid-cols-2 gap-2">
          {ADHOC_PRESETS.map(preset => {
            const isSelected =
              selectedRecipientId === ADHOC_RECIPIENT_UUID && selectedRecipientName === preset.name
            return (
              <Button
                key={preset.name}
                size="lg"
                variant={isSelected ? 'subtleTertiary' : 'outline'}
                onClick={() => handlePresetSelect(preset.name)}
                className="border-none shadow justify-start"
              >
                <span className="mr-2">{preset.icon}</span>
                <span className="flex-1 text-left">{preset.name}</span>
                {isSelected && <Check className="h-4 w-4 ml-2" />}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Custom Entry */}
      <div className="mt-4 space-y-2">
        {!showCustomInput ? (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowCustomInput(true)}
            className="w-full justify-start"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addCustomRecipient') || 'Add Custom Recipient'}
          </Button>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="custom-recipient">
              {t('customRecipientName') || 'Custom Recipient Name'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="custom-recipient"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder={t('customRecipientPlaceholder') || 'e.g., Local School, Church...'}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCustomSubmit()
                  if (e.key === 'Escape') {
                    setShowCustomInput(false)
                    setCustomName('')
                  }
                }}
                autoFocus
              />
              <Button onClick={handleCustomSubmit} disabled={!customName.trim()}>
                {tCommon('add') || 'Add'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomName('')
                }}
              >
                {tCommon('cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ad-hoc Recipients Already Added */}
      {adhocRecipientsList.length > 0 && (
        <div className="space-y-2 mt-4">
          <Typography variant="muted" className="text-sm">
            {t('recentQuickOptions') || 'Recent Quick Options'}
          </Typography>
          <div className="grid grid-cols-1 gap-2">
            {adhocRecipientsList.map(recipient => {
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
      )}
    </div>
  )
}
