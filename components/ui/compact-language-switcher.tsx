'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Language, useLanguageStore } from '@/lib/stores/language-store'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompactLanguageSwitcherProps {
  hasBg?: boolean
}

const lifo_LANGUAGES = {
  fr: { name: 'Français' },
  en: { name: 'English' },
} as const

export function CompactLanguageSwitcher({ hasBg = true }: CompactLanguageSwitcherProps) {
  const { currentLanguage, setLanguage, isLoading } = useLanguageStore()
  const t = useTranslations('common.aria')

  const handleLanguageChange = async (language: string) => {
    await setLanguage(language as Language)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={isLoading}
          className={cn(
            hasBg ? 'rounded-full border size-10' : 'bg-opacity-0 border-none shadow-none',
          )}
          aria-label={t('selectLanguage')}
        >
          <Globe className={cn('size-4', !hasBg && 'size-5')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(lifo_LANGUAGES).map(([code, { name }]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code)}
            className={currentLanguage === code ? 'bg-muted' : ''}
          >
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
