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

const lifo_LANGUAGES = {
  fr: { name: 'Français' },
  en: { name: 'English' },
  nl: { name: 'Nederlands' },
} as const

export function CompactLanguageSwitcher() {
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
          className="rounded-full border size-10"
          aria-label={t('selectLanguage')}
        >
          <Globe className="h-4 w-4" />
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
