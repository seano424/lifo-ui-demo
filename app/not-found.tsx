'use client'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const t = useTranslations('errors')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center container">
      <div className="max-w-4xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-8"
        >
          <Typography className="tracking-tight text-6xl sm:text-7xl xl:text-9xl" variant="h1">
            {t('pageNotFoundTitle', { fallback: 'Page not found' })}
          </Typography>

          <Typography as="p" color="muted">
            {t('pageNotFoundDescription', {
              fallback: "The page you're looking for doesn't exist or has been moved.",
            })}
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
              {t('backToHome', { fallback: 'Back to Home' })}
              <ArrowLeft className="w-4 h-4 -rotate-180" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
