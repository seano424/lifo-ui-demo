'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { ArrowRight, PackageOpen, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export function DashboardWelcome() {
  const t = useTranslations('dashboard')

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h3">{t('welcome.title')}</Typography>

      <Typography variant="p">{t('welcome.description')}</Typography>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        {/* Settings card */}
        <WelcomeActionCard
          title="welcome.actions.settings.title"
          description="welcome.actions.settings.description"
          icon={<Settings className="h-6 w-6" />}
          link="/dashboard/settings"
          variant="primary"
        />

        {/* Products card */}
        <WelcomeActionCard
          title="welcome.actions.batches.title"
          description="welcome.actions.batches.description"
          icon={<PackageOpen className="h-6 w-6" />}
          link="/dashboard/inventory/batches"
          variant="secondary"
        />
      </div>
    </div>
  )
}

type WelcomeActionCardProps = {
  title: string
  description: string
  icon: React.ReactNode
  link: string
  variant: 'primary' | 'secondary'
}

function WelcomeActionCard({
  title,
  description,
  icon,
  link,
  variant = 'primary',
}: WelcomeActionCardProps) {
  const t = useTranslations('dashboard')

  return (
    <Link href={link} className="block h-full">
      <Card className={cn('transition-all h-full overflow-hidden group rounded-xl border')}>
        <div className="flex flex-col gap-3 p-4 h-full">
          {/* Icon with smaller styling */}
          <div
            className={cn(
              'p-2 rounded-md w-fit',
              variant === 'primary'
                ? 'bg-primary-100 text-primary-800 dark:bg-background/30 dark:text-primary-300'
                : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
            )}
          >
            {icon}
          </div>

          <div className="flex flex-col gap-2 flex-grow">
            <Typography variant="h4">{t(title)}</Typography>
            <Typography variant="p" className="text-muted-foreground text-sm">
              {t(description)}
            </Typography>
          </div>

          {/* Action button with more compact styling */}
          <div className="flex items-center mt-auto pt-2 border-t border-gray-100/50 dark:border-gray-800/50">
            <div
              className={cn(
                'flex items-center gap-1 text-sm  transition-all',
                variant === 'primary'
                  ? 'text-primary group-hover:text-primary-800'
                  : 'text-secondary group-hover:text-secondary-700',
              )}
            >
              <span>{t('welcome.actions.getStarted')}</span>
              <ArrowRight className="h-3.5 w-3.5 transform transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
