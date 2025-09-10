'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { type ScannedItem, ScanOutInterface } from '@/components/scanning'
import { Typography } from '@/components/ui/typography'

export default function OutboundPage() {
  const t = useTranslations('scanOut')
  const [removedItems, setRemovedItems] = useState<ScannedItem[]>([])

  const handleItemRemoved = (item: ScannedItem) => {
    setRemovedItems(prev => [item, ...prev])
  }

  return (
    <div className="lg:max-w-screen-sm lg:mx-auto pb-40">
      <div className="space-y-6 px-4">
        <ScanOutInterface onItemRemoved={handleItemRemoved} />

        {removedItems.length > 0 && (
          <div className="mt-8 space-y-2">
            <Typography variant="h3" className="text-center font-black text-primary-900">
              {t('recentlyRemoved', { count: removedItems.length })}
            </Typography>
            <div className="space-y-2">
              {removedItems.slice(0, 5).map((item, index) => (
                <div
                  key={`${item.id}-${index}-${item.expiryDate}`}
                  className="py-4 px-8 bg-primary-900 text-white rounded-2xl border border-primary-200 w-max mx-auto"
                >
                  <Typography variant="p" className="font-bold text-white">
                    {item.productName}
                  </Typography>
                  <Typography variant="p" className="text-sm text-white">
                    {t('removedQuantityExpires', {
                      quantity: item.quantity,
                      date: new Date(item.expiryDate).toLocaleDateString(),
                    })}
                  </Typography>
                </div>
              ))}
              {removedItems.length > 5 && (
                <Typography variant="p">
                  {t('andMoreItems', { count: removedItems.length - 5 })}
                </Typography>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
