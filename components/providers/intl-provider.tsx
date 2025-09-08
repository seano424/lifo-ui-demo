'use client'

import { NextIntlClientProvider } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { useLanguageStore } from '@/lib/stores/language-store'

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
        let newMessages: { default: Record<string, unknown> }
        switch (language) {
          case 'en':
            newMessages = await import(`../../messages/en.json`)
            break
          case 'nl':
            newMessages = await import(`../../messages/nl.json`)
            break
          default:
            newMessages = await import(`../../messages/fr.json`)
            break
        }
        // Only update messages if we successfully loaded them and they contain data
        if (newMessages.default && Object.keys(newMessages.default).length > 0) {
          setMessages(newMessages.default)
        }
      } catch (error) {
        console.error(`Failed to load messages for ${language}:`, error)
        // Fallback to French
        try {
          const fallbackMessages = await import(`../../messages/fr.json`)
          if (fallbackMessages.default && Object.keys(fallbackMessages.default).length > 0) {
            setMessages(fallbackMessages.default)
          }
        } catch (fallbackError) {
          console.error('Failed to load fallback messages:', fallbackError)
          // Keep existing messages instead of overriding with potentially empty initialMessages
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

  // Ensure we always have valid messages before rendering
  const validMessages = messages && Object.keys(messages).length > 0 ? messages : initialMessages

  return (
    <NextIntlClientProvider
      locale={currentLanguage}
      messages={validMessages}
      timeZone="Europe/Paris"
      onError={error => {
        console.warn('Client i18n error:', error.message)
      }}
    >
      {children}
    </NextIntlClientProvider>
  )
}
