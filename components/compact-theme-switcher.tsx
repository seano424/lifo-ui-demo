'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface CompactThemeSwitcherProps {
  hasBg?: boolean
}

const CompactThemeSwitcher = ({ hasBg = true }: CompactThemeSwitcherProps) => {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const t = useTranslations('settings.theme')

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return disabled button with default state to prevent hydration mismatch
    return (
      <Button variant="outline" size={'sm'} disabled aria-label={t('title')}>
        <Laptop size={16} className={'text-muted-foreground'} />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            hasBg ? 'rounded-full border size-10' : 'bg-opacity-0 border-none shadow-none',
          )}
          size={'sm'}
          aria-label={t('title')}
        >
          {theme === 'light' ? (
            <Sun
              key="light"
              className={cn('text-muted-foreground size-4', !hasBg && 'text-black size-5')}
            />
          ) : theme === 'dark' ? (
            <Moon
              key="dark"
              className={cn('text-muted-foreground size-4', !hasBg && 'text-white size-5')}
            />
          ) : (
            <Laptop
              key="system"
              className={cn('text-muted-foreground size-4', !hasBg && 'text-black size-5')}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuRadioGroup value={theme} onValueChange={e => setTheme(e)}>
          <DropdownMenuRadioItem className="flex gap-2" value="light">
            <Sun className={cn('size-4', !hasBg && 'size-5')} /> <span>{t('light')}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="dark">
            <Moon className={cn('size-4', !hasBg && 'size-5')} /> <span>{t('dark')}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="system">
            <Laptop className={cn('size-4', !hasBg && 'size-5')} /> <span>{t('system')}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { CompactThemeSwitcher }
