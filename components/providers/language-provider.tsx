'use client'

import { useEffect } from 'react'
import { useLanguageStore } from '@/lib/stores/language-store'

export function LanguageProvider({
  children,
  userId,
}: {
  children: React.ReactNode
  userId?: string
}) {
  const { initializeLanguage } = useLanguageStore()

  useEffect(() => {
    initializeLanguage()
  }, [userId, initializeLanguage])

  return <>{children}</>
}
