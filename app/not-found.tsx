'use client'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { motion } from 'framer-motion'
import { ArrowLeft, Home } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  const t = useTranslations('errors')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/90">
      <div className="max-w-md w-full space-y-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center mb-6">
            <Image
              src="/logos/lifo-logo-icon.svg"
              alt="LIFO AI Logo"
              width={80}
              height={80}
              className="h-20 w-auto opacity-70"
            />
          </div>

          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.2,
            }}
          >
            <Typography as="h1" className="text-9xl font-bold text-primary mb-2">
              404
            </Typography>
          </motion.div>

          <Typography as="h2" className="text-2xl font-semibold mb-2">
            {t('pageNotFoundTitle', { fallback: 'Page not found' })}
          </Typography>

          <Typography as="p" className="text-muted-foreground mb-8">
            {t('pageNotFoundDescription', {
              fallback: "The page you're looking for doesn't exist or has been moved.",
            })}
          </Typography>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="default">
              <Link href="/" className="flex items-center gap-2">
                <Home size={18} />
                {t('backToHome', { fallback: 'Back to Home' })}
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" onClick={() => window.history.back()}>
              <div className="flex items-center gap-2 cursor-pointer">
                <ArrowLeft size={18} />
                {t('goBack', { fallback: 'Go Back' })}
              </div>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="pt-16"
        >
          <Typography as="p" className="text-sm text-muted-foreground/60">
            {t('needHelp', { fallback: 'Need help?' })}{' '}
            <a href="mailto:contact@lifo-app.com" className="text-primary hover:underline">
              {t('contactSupport', { fallback: 'Contact our support team' })}
            </a>
          </Typography>
        </motion.div>
      </div>
    </div>
  )
}
