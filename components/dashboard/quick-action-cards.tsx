'use client'

import { CheckSquare, ListTodo, Minus, PackageOpen, Plus, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Typography } from '@/components/ui/typography'
import { QuickActionCard } from './quick-action-card'

export function QuickActionCards() {
  const t = useTranslations('dashboard')

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <Typography variant="h4" className="font-bold">
          {t('quickActions.title')}
        </Typography>
        <Typography variant="p" className="text-muted-foreground">
          {t('quickActions.description')}
        </Typography>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
