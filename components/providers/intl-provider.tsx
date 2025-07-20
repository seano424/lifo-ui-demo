'use client'

import { NextIntlClientProvider } from 'next-intl'
import { useLanguageStore } from '@/lib/stores/language-store'
import { useEffect, useState, useCallback } from 'react'

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
  const [isHydrated, setIsHydrated] = useState(false)

  const loadMessages = useCallback(
    async (language: string) => {
      try {
        let newMessages
        switch (language) {
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
        console.error(`Failed to load messages for ${language}:`, error)
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
    },
    [initialMessages],
  )

  // Handle hydration mismatch by detecting visitor language preference on client
  useEffect(() => {
    if (!isHydrated) {
      setIsHydrated(true)

      // Check if we need to load visitor language preference
      const storedLanguage = localStorage.getItem('lifo-language-preference')
      if (storedLanguage) {
        const parsed = JSON.parse(storedLanguage)
        if (parsed.state?.currentLanguage && parsed.state.currentLanguage !== 'fr') {
          // Load the stored visitor language immediately
          loadMessages(parsed.state.currentLanguage)
          return
        }
      }

      // Check browser language if no stored preference
      const browserLang = navigator.language.split('-')[0]
      if (['en', 'nl'].includes(browserLang) && browserLang !== 'fr') {
        loadMessages(browserLang)
        return
      }
    }

    // Normal language change handling
    loadMessages(currentLanguage)
  }, [currentLanguage, isHydrated, loadMessages])

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
