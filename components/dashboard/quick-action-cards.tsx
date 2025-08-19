'use client'

import { useTranslations } from 'next-intl'
import { Plus, ShoppingBag } from 'lucide-react'
import { Minus, CheckSquare, ListTodo, PackageOpen } from 'lucide-react'

import { Typography } from '@/components/ui/typography'
import { QuickActionCard } from './quick-action-card'

export function QuickActionCards() {
  const t = useTranslations('dashboard')

  return (
    <div className="w-full mb-8 px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <Typography variant="h3">{t('quickActions.title')}</Typography>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <QuickActionCard
          variant="primary"
          title="addProducts.title"
          description="addProducts.description"
          primaryIcon={<Plus className="h-3.5 w-3.5" />}
          secondaryIcon={<ShoppingBag className="h-4 w-4" />}
          link="/dashboard/inbound"
          translationKey="dashboard.quickActions"
        />

        <QuickActionCard
          variant="secondary"
          title="removeProducts.title"
          description="removeProducts.description"
          primaryIcon={<Minus className="h-3.5 w-3.5" />}
          secondaryIcon={<PackageOpen className="h-4 w-4" />}
          link="/dashboard/outbound"
          translationKey="dashboard.quickActions"
        />
        <QuickActionCard
          variant="secondary"
          title="todoSuggestions.title"
          description="todoSuggestions.description"
          primaryIcon={<CheckSquare className="h-3.5 w-3.5" />}
          secondaryIcon={<ListTodo className="h-4 w-4" />}
          link="/dashboard/todo"
          translationKey="dashboard.quickActions"
        />
      </div>
    </div>
  )
}
