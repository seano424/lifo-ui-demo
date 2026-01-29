'use client'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { type ScannedItem, ScanOutInterface } from '@/components/scanning'
import { Typography } from '@/components/ui/typography'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export default function ScanOutPage() {
  const t = useTranslations('dashboard.scanOut')
  const [removedItems, setRemovedItems] = useState<ScannedItem[]>([])

  const handleItemRemoved = (item: ScannedItem) => {
    setRemovedItems(prev => [item, ...prev])
  }

  return (
    <div className="space-y-6 px-4 container md:py-6 lg:py-8">
      <DashboardInsetHeader title={t('title')} description={t('description')} />
      <div className="lg:max-w-screen-sm lg:mx-auto pb-40 mt-8">
        <ScanOutInterface onItemRemoved={handleItemRemoved} />

        {removedItems.length > 0 && (
          <div className="mt-8 flex flex-col gap-8">
            <Typography variant="h3" className="text-center font-black text-primary-800">
              {t('recentlyRemoved', { count: removedItems.length })}
            </Typography>
            <div className="flex flex-col gap-2">
              {removedItems.slice(0, 5).map((item, index) => (
                <div
                  key={`${item.id}-${index}-${item.expiryDate}`}
                  className="py-4 px-8 bg-primary-900 text-white rounded-2xl border border-primary-200 w-max mx-auto flex flex-col gap-2"
                >
                  <Typography variant="p" className="font-bold text-white">
                    {item.productName}
                  </Typography>
                  <Typography variant="p" className="text-sm text-white">
                    {t('removedQuantityExpires', {
                      quantity: item.quantity,
                      date: item.expiryDate
                        ? new Date(item.expiryDate).toLocaleDateString()
                        : 'N/A',
                    })}
                  </Typography>
                </div>
              ))}
            </div>
            {removedItems.length > 5 && (
              <Typography variant="p">
                {t('andMoreItems', { count: removedItems.length - 5 })}
              </Typography>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
