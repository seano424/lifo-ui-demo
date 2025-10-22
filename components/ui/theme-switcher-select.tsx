'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

const THEME_OPTIONS = {
  light: { name: 'account.theme.light', icon: Sun },
  dark: { name: 'account.theme.dark', icon: Moon },
  system: { name: 'account.theme.system', icon: Laptop },
} as const

export function ThemeSwitcherSelect() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = useTranslations()
  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return disabled select with default state to prevent hydration mismatch
    return (
      <Select disabled>
        <SelectTrigger className="w-44">
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            <SelectValue placeholder={t('system')} />
          </div>
        </SelectTrigger>
      </Select>
    )
  }

  const getCurrentThemeIcon = () => {
    switch (theme) {
      case 'light':
        return Sun
      case 'dark':
        return Moon
      default:
        return Laptop
    }
  }

  const CurrentIcon = getCurrentThemeIcon()

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-44">
        <div className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(THEME_OPTIONS).map(([value, { name: key }]) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <span>{t(key)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
