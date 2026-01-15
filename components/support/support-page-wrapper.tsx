import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ArrowLeft, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface SupportPageWrapperProps {
  children: React.ReactNode
  title: string
  description: string
  readTime: string
  intro?: string
}

export function SupportPageWrapper({
  children,
  title,
  description,
  readTime,
  intro,
}: SupportPageWrapperProps) {
  const t = useTranslations('common.buttons')

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Back Navigation */}
      <Button variant="ghost" size="sm" asChild className="w-fit p-2 h-auto -ml-2">
        <Link href="/dashboard/support" className="inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          {t('backToSupportCenter')}
        </Link>
      </Button>

      {/* Article Header */}
      <DashboardInsetHeader
        title={title}
        description={description}
        showIcon={false}
        rightContent={
          <div className="flex items-center gap-1 text-sm text-muted-foreground ">
            <Clock className="h-4 w-4" />
            <span>{readTime}</span>
          </div>
        }
      />

      {/* Optional Intro */}
      {intro && (
        <Typography
          variant="p"
          className="text-center text-base md:text-lg text-muted-foreground leading-relaxed max-w-4xl py-4"
        >
          {intro}
        </Typography>
      )}

      <div className="space-y-6">{children}</div>
    </div>
  )
}
