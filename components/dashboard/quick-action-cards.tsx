'use client'

import { Typography } from '@/components/ui/typography'
import { useTranslations } from 'next-intl'
import { AddProductsCard } from './add-products-card'
import { RemoveProductsCard } from './remove-products-card'
import { TodoSuggestionsCard } from './todo-suggestions-card'

export function QuickActionCards() {
  const t = useTranslations('dashboard')

  return (
    <div className="w-full mb-8 px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <Typography className="text-primary font-bold" variant="h3">
          {t('quickActions.title')}
        </Typography>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AddProductsCard />
        <TodoSuggestionsCard />
        <RemoveProductsCard />
      </div>
    </div>
  )
}
