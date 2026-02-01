'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { ArrowRight, BarChart3, PackageOpen, ScanSearch, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export function DashboardWelcome() {
  const t = useTranslations('dashboard')

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h3">{t('welcome.title')}</Typography>

      <Typography variant="p">{t('welcome.description')}</Typography>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {/* Deliveries card */}
        <WelcomeActionCard
          title="welcome.actions.deliveries.title"
          description="welcome.actions.deliveries.description"
          icon={<ScanSearch className="h-6 w-6" />}
          link="/dashboard/deliveries"
          variant="primary"
        />

        {/* Settings card */}
        <WelcomeActionCard
          title="welcome.actions.settings.title"
          description="welcome.actions.settings.description"
          icon={<Settings className="h-6 w-6" />}
          link="/dashboard/settings"
          variant="secondary"
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

      {/* Help section with subtle design */}
      <div className="mt-4 rounded-2xl border bg-background">
        <div className="p-3 sm:p-6 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 items-center">
          {/* Left side with icon and text */}
          <div className="flex flex-col justify-center items-center md:items-start gap-3 md:gap-4 flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <BarChart3 className="text-secondary h-5 w-5 shrink-0" />
              <Typography variant="h4" className=" text-base sm:text-lg">
                {t('welcome.help.title')}
              </Typography>
            </div>
            <Typography
              variant="p"
              className="mx-4 sm:mx-2 text-muted-foreground text-sm sm:text-base leading-relaxed"
            >
              {t('welcome.help.description')}
            </Typography>

            <Button
              asLink
              href="/dashboard/support"
              target="blank"
              variant="outline"
              className="w-[90%] sm:w-fit mt-2 group text-secondary text-xs sm:text-sm"
            >
              {t('welcome.help.learnMore')}
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Right side with illustration */}
          <div className="shrink-0 relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48">
            <Logo variant="svg" size="xl" className="w-full h-full opacity-30" />
          </div>
        </div>
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
