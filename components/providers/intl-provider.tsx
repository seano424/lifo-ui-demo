'use client'

import { NextIntlClientProvider } from 'next-intl'
import { useLanguageStore } from '@/lib/stores/language-store'
import { useEffect, useState } from 'react'

interface Messages {
  [key: string]: unknown
}

export function IntlProvider({
  children,
  initialMessages,
}: {
  children: React.ReactNode
  initialMessages: Messages
}) {
  const { currentLanguage } = useLanguageStore()
  const [messages, setMessages] = useState<Messages>(initialMessages)

  useEffect(() => {
    // Dynamically load messages for the current language
    const loadMessages = async () => {
      try {
        const newMessages = await import(`../../messages/${currentLanguage}.json`)
        setMessages(newMessages.default)
      } catch (error) {
        console.error(`Failed to load messages for ${currentLanguage}:`, error)
        // Fallback to French
        const fallbackMessages = await import(`../../messages/fr.json`)
        setMessages(fallbackMessages.default)
      }
    }

    loadMessages()
  }, [currentLanguage])

  return (
    <NextIntlClientProvider locale={currentLanguage} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
