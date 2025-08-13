'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Store } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

interface NoStoresErrorProps {
  redirectPath?: string
  className?: string
}

export function NoStoresError({
  redirectPath = '/onboarding/create-account',
  className = '',
}: NoStoresErrorProps) {
  const t = useTranslations('dashboard.errors')

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] w-full px-4 sm:px-6 py-8 ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[340px] sm:max-w-md"
      >
        <Card className="border border-red-200 dark:border-red-900/30 shadow-lg overflow-hidden">
          <CardHeader className="pb-4 pt-5 sm:pt-6 px-4 sm:px-6 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2 sm:p-3">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
              </div>
              <Typography
                variant="h3"
                className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-400"
              >
                {t('noStores.title')}
              </Typography>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Typography
              variant="p"
              className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4"
            >
              {t('noStores.description')}
            </Typography>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4 rounded-lg border border-amber-200 dark:border-amber-800/30 mb-2">
              <div className="flex items-start gap-3">
                <Store className="h-20 w-20 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <Typography
                    variant="p"
                    className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300"
                  >
                    {t('noStores.tip.title')}
                  </Typography>
                  <Typography
                    variant="p"
                    className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 mt-1"
                  >
                    {t('noStores.tip.description')}
                  </Typography>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gradient-to-r from-red-50/50 to-red-100/50 dark:from-red-950/10 dark:to-red-900/10 p-4 sm:p-6 border-t border-red-100 dark:border-red-900/20">
            <Link href={redirectPath} className="w-full">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-1.5 sm:py-2 text-sm sm:text-base"
                size="default"
                type="button"
              >
                {t('noStores.button')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
