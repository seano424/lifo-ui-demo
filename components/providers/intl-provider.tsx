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
        let newMessages
        switch (currentLanguage) {
          case 'en':
            newMessages = await import(`../../messages/en.json`)
            break
          case 'nl':
            newMessages = await import(`../../messages/nl.json`)
            break
          case 'fr':
          default:
            newMessages = await import(`../../messages/fr.json`)
            break
        }
        setMessages(newMessages.default)
      } catch (error) {
        console.error(`Failed to load messages for ${currentLanguage}:`, error)
        // Fallback to French
        try {
          const fallbackMessages = await import(`../../messages/fr.json`)
          setMessages(fallbackMessages.default)
        } catch (fallbackError) {
          console.error('Failed to load fallback messages:', fallbackError)
          // Use the initial messages as last resort
          setMessages(initialMessages)
        }
      }
    }

    loadMessages()
  }, [currentLanguage, initialMessages])

  return (
    <NextIntlClientProvider
      locale={currentLanguage}
      messages={messages}
      timeZone="Europe/Paris"
      onError={error => {
        console.warn('Client i18n error:', error.message)
      }}
    >
      {children}
    </NextIntlClientProvider>
  )
}
