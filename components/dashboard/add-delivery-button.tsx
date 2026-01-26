'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { DeliveryLogSheet } from '@/components/delivery-log'

export function AddDeliveryButton() {
  const t = useTranslations('dashboard.actions')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        size="lg"
        variant="gray"
        className="w-full rounded-lg"
        onClick={() => setIsOpen(true)}
      >
        {t('addDelivery')}
      </Button>

      <DeliveryLogSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        onComplete={() => {
          setIsOpen(false)
        }}
      />
    </>
  )
}
