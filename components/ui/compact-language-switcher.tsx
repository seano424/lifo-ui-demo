'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Language, useLanguageStore } from '@/lib/stores/language-store'
import { Globe } from 'lucide-react'

const LIFO_LANGUAGES = {
  fr: { name: 'Français' },
  en: { name: 'English' },
  nl: { name: 'Nederlands' },
} as const

export function CompactLanguageSwitcher() {
  const { currentLanguage, setLanguage, isLoading } = useLanguageStore()

  const handleLanguageChange = async (language: string) => {
    await setLanguage(language as Language)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isLoading} className="rounded-full border">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LIFO_LANGUAGES).map(([code, { name }]) => (
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
