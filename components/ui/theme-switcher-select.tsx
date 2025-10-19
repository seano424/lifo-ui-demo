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

const THEME_OPTIONS = {
  light: { name: 'Light', icon: Sun },
  dark: { name: 'Dark', icon: Moon },
  system: { name: 'System', icon: Laptop },
} as const

export function ThemeSwitcherSelect() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
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
        {Object.entries(THEME_OPTIONS).map(([value, { name }]) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <span>{name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
