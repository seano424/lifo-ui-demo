'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

export function AddDeliveryButton() {
  const t = useTranslations('dashboard.actions')

  return (
    <Button
      size="lg"
      asLink
      variant="gray"
      className="w-full rounded-lg"
      href="/dashboard/deliveries"
    >
      {t('addDelivery')}
    </Button>
  )
}
