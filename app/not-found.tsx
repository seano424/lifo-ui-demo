import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('errors')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center container">
      <div className="max-w-4xl w-full text-center">
        <div className="flex flex-col gap-8">
          <Typography className="tracking-tight text-6xl sm:text-7xl xl:text-9xl" variant="h1">
            {t('pageNotFoundTitle')}
          </Typography>

          <Typography as="p" color="muted">
            {t('pageNotFoundDescription')}
          </Typography>

          <div className="flex flex-col gap-4 justify-center items-center">
            <Button
              size="xl"
              asChild
              variant="black"
              className="rounded-full w-fit font-mono tracking-tight"
              asLink
              href="/"
            >
              {t('backToHome')}
              <ArrowLeft className="w-4 h-4 -rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
