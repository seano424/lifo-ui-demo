'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Language, useLanguageStore } from '@/lib/stores/language-store'

const lifo_LANGUAGES = {
  fr: { name: 'Français' },
  en: { name: 'English' },
  nl: { name: 'Nederlands' },
} as const

export function LanguageSwitcher() {
  const { currentLanguage, setLanguage, isLoading } = useLanguageStore()

  const handleLanguageChange = async (language: Language) => {
    await setLanguage(language)
  }

  return (
    <Select value={currentLanguage} onValueChange={handleLanguageChange} disabled={isLoading}>
      <SelectTrigger className="w-44">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(lifo_LANGUAGES).map(([code, { name }]) => (
          <SelectItem key={code} value={code}>
            <div className="flex items-center gap-2">
              <span>{name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Alternative: Simple button group version for mobile
export function LanguageButtonGroup() {
  const { currentLanguage, setLanguage, isLoading } = useLanguageStore()

  return (
    <div className="flex items-center gap-1 rounded-2xl border p-1">
      {Object.entries(lifo_LANGUAGES).map(([code]) => (
        <Button
          key={code}
          variant={currentLanguage === code ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage(code as Language)}
          disabled={isLoading}
          className="h-8 px-3"
        >
          {code.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}
