'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Store } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

interface NoStoresErrorProps {
  redirectPath?: string
  className?: string
}

export function NoStoresError({
  redirectPath = '/auth/sign-up',
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
        <Card className="border border-destructive/30 shadow-lg overflow-hidden">
          <CardHeader className="pb-4 pt-5 sm:pt-6 px-4 sm:px-6 bg-destructive/10 dark:bg-destructive/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-destructive/20 dark:bg-destructive/30 p-2.5 sm:p-3.5">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" />
              </div>
              <Typography variant="h3" className="text-lg sm:text-2xl  text-destructive">
                {t('noStores.title')}
              </Typography>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Typography variant="p" className="text-sm sm:text-base text-muted-foreground mb-4">
              {t('noStores.description')}
            </Typography>
            <div className="bg-primary/5 p-3 sm:p-4 rounded-2xl border border-primary/25 mb-2">
              <div className="flex items-start gap-4">
                <Store className="h-12 w-12 sm:h-20 sm:w-20 text-primary-800 dark:text-primary-200" />
                <div>
                  <Typography
                    variant="p"
                    className="text-xs sm:text-lg  text-primary-800 dark:text-primary-200"
                  >
                    {t('noStores.tip.title')}
                  </Typography>
                  <Typography variant="p" className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {t('noStores.tip.description')}
                  </Typography>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-destructive/5 dark:bg-destructive/10 p-4 sm:p-6 border-t border-destructive/20 dark:border-destructive/30">
            <Link href={redirectPath} className="w-full">
              <Button
                className="w-full bg-linear-to-r from-primary to-secondary-900 hover:bg-linear-to-r hover:from-primary/90 hover:to-secondary-900/90 text-primary-foreground  py-1.5 sm:py-2 text-sm sm:text-base shadow-md"
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
