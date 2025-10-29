'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface BackToHomeButtonProps {
  className?: string
}

export function BackToHomeButton({ className }: BackToHomeButtonProps) {
  const t = useTranslations('auth.loginForm')

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-muted-foreground hover:text-foreground"
      >
        <Link href="/" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToHome')}</span>
        </Link>
      </Button>
    </div>
  )
}
