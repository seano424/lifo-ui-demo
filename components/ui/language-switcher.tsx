'use client'

import { useLanguageStore, type Language } from '@/lib/stores/language-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

const LIFO_LANGUAGES = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  nl: { name: 'Nederlands', flag: '🇳🇱' },
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
        {Object.entries(LIFO_LANGUAGES).map(([code, { name, flag }]) => (
          <SelectItem key={code} value={code}>
            <div className="flex items-center gap-2">
              <span>{flag}</span>
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
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {Object.entries(LIFO_LANGUAGES).map(([code, { flag }]) => (
        <Button
          key={code}
          variant={currentLanguage === code ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage(code as Language)}
          disabled={isLoading}
          className="h-8 px-3"
        >
          <span className="mr-1">{flag}</span>
          {code.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}
