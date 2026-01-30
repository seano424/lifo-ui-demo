'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

type QuickActionCardProps = {
  title: string
  description: string
  primaryIcon: React.ReactNode
  link: string
  translationKey: string
  variant: 'primary' | 'secondary'
}

export function QuickActionCard({
  title,
  description,
  primaryIcon,
  link,
  translationKey,
  variant = 'primary',
}: QuickActionCardProps) {
  const t = useTranslations(translationKey)

  // Define subtle backgrounds based on variant (matching WelcomeActionCard)
  const subtleBg =
    variant === 'primary'
      ? 'bg-primary-50/50 dark:bg-primary-950/10'
      : 'bg-secondary-50/50 dark:bg-secondary-950/10'

  // Define subtle hover effect (matching WelcomeActionCard)
  const hoverEffect =
    variant === 'primary'
      ? 'group-hover:border-primary/30 group-hover:shadow-sm'
      : 'group-hover:border-secondary/30 group-hover:shadow-sm'

  return (
    <Link href={link} className="block">
      <Card
        className={cn(
          'transition-all h-full overflow-hidden group rounded-xl border',
          hoverEffect,
          subtleBg,
        )}
      >
        <div className="flex items-start gap-3 p-4 h-full">
          {/* Icon with WelcomeActionCard styling */}
          <div
            className={cn(
              'p-2 rounded-md w-fit',
              variant === 'primary'
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
                : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
            )}
          >
            {primaryIcon}
          </div>

          <div className="flex flex-col gap-2 flex-grow">
            <div className="flex items-center justify-between gap-3">
              <Typography variant="h4" className="font-semibold">
                {t(title)}
              </Typography>
              <ArrowRight
                className={cn(
                  'h-4 w-4 transform transition-transform group-hover:translate-x-1 shrink-0',
                  variant === 'primary'
                    ? 'text-primary group-hover:text-primary-800'
                    : 'text-secondary group-hover:text-secondary-700',
                )}
              />
            </div>
            <Typography variant="p" className="text-muted-foreground text-sm">
              {t(description)}
            </Typography>
          </div>
        </div>
      </Card>
    </Link>
  )
}
