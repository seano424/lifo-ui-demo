'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

export function AddDeliveryButton() {
  const t = useTranslations('dashboard.actions')

  return (
    <Link href="/dashboard/deliveries" className="block w-full">
      <Button size="lg" className="w-full min-h-[48px] gap-2">
        <Plus className="h-5 w-5" />
        {t('addDelivery')}
      </Button>
    </Link>
  )
}
