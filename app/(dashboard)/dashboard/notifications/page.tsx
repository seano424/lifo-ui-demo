import { useTranslations } from 'next-intl'
import ComingSoon from '@/components/ui/coming-soon'
import { Typography } from '@/components/ui/typography'

export default function NotificationsPage() {
  const t = useTranslations('dashboardNav.pages')

  return (
    <ComingSoon
      title={t('notifications')}
      description="We're working on adding notifications to your dashboard."
    >
      <Typography variant="p" className="text-muted-foreground">
        Please check back soon.
      </Typography>
      <Typography variant="h4" className="text-muted-foreground">
        👀
      </Typography>
    </ComingSoon>
  )
}
