'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BackToHomeButtonProps {
  className?: string
}

export function BackToHomeButton({ className }: BackToHomeButtonProps) {
  const t = useTranslations('auth.loginForm')

  return (
    <div className={className}>
      <Button variant="ghost" size="sm" asChild asLink href="/">
        <ArrowLeft className="w-4 h-4" />
        <span>{t('backToHome')}</span>
      </Button>
    </div>
  )
}
