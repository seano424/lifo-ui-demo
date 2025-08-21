'use client'

import { useEffect } from 'react'
import { useLanguageStore } from '@/lib/stores/language-store'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { initializeLanguage } = useLanguageStore()

  useEffect(() => {
    initializeLanguage()
  }, [initializeLanguage])

  return <>{children}</>
}
