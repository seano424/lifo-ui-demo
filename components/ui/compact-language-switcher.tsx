'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguageStore, type Language } from '@/lib/stores/language-store'
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
        <Button variant="ghost" size="sm" className="px-2" disabled={isLoading}>
          <Globe className="h-4 w-4 text-muted-foreground" />
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
