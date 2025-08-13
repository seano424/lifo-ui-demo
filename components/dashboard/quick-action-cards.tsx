'use client'

import { Typography } from '@/components/ui/typography'
import { useTranslations } from 'next-intl'
import { AddProductsCard } from './add-products-card'
import { RemoveProductsCard } from './remove-products-card'
import { TodoSuggestionsCard } from './todo-suggestions-card'

export function QuickActionCards() {
  const t = useTranslations('dashboard')

  return (
    <div className="w-full mb-8 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-900/20 dark:to-transparent px-4 py-3 rounded-lg border-t border-l border-r border-b border-slate-200/50 dark:border-slate-800/40">
      <div className="flex justify-between items-center mb-3">
        <Typography
          className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 inline-block text-transparent bg-clip-text font-bold"
          variant="h3"
        >
          {t('quickActions.title')}
        </Typography>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <AddProductsCard />
        <TodoSuggestionsCard />
        <RemoveProductsCard />
      </div>
    </div>
  )
}
