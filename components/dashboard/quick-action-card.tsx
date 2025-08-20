'use client'

import { Typography } from '@/components/ui/typography'
import { useTranslations } from 'next-intl'

import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type QuickActionCardProps = {
  title: string
  description: string
  primaryIcon: React.ReactNode
  secondaryIcon: React.ReactNode
  link: string
  translationKey: string
  variant: 'primary' | 'secondary'
}

const variantColors = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
}

export function QuickActionCard({
  title,
  description,
  primaryIcon,
  secondaryIcon,
  link,
  translationKey,
  variant = 'primary',
}: QuickActionCardProps) {
  const t = useTranslations(translationKey)

  return (
    <Link href={link} className="block h-full">
      <Card
        className={cn(
          'hover:shadow-md transition-all hover:bg-primary/5 h-full overflow-hidden group rounded-2xl shadow-xl border-0',
        )}
      >
        <div className="flex items-start gap-3 p-5">
          <div
            className={cn(
              'p-1.5 rounded-full text-primary-foreground shadow-sm',
              variantColors[variant],
            )}
          >
            {primaryIcon}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Typography variant="h4">{t(title)}</Typography>
              <span
                className={cn(
                  variant === 'primary' && 'text-primary-900',
                  variant === 'secondary' && 'text-secondary-900',
                )}
              >
                {secondaryIcon}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <Typography variant="small" className="text-muted-foreground">
                {t(description)}
              </Typography>
              <ArrowRight
                className={cn(
                  'h-4 w-4 transform transition-transform group-hover:translate-x-1 flex-shrink-0',
                  variant === 'primary' && 'text-primary-900',
                  variant === 'secondary' && 'text-secondary-900',
                )}
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
