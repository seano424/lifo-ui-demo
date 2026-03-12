'use client'

import { NextIntlClientProvider } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { loadMessages } from '@/lib/load-messages'
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

  const loadMessagesCallback = useCallback(async (language: string) => {
    try {
      const newMessages = await loadMessages(language)
      // Only update messages if we successfully loaded them and they contain data
      if (newMessages && Object.keys(newMessages).length > 0) {
        setMessages(newMessages)
      }
    } catch (error) {
      console.error(`Failed to load messages for ${language}:`, error)
      // Keep existing messages instead of overriding with potentially empty initialMessages
    }
  }, [])

  // Handle hydration mismatch by detecting visitor language preference on client
  useEffect(() => {
    if (!isHydrated) {
      setIsHydrated(true)

      // Check if we need to load visitor language preference
      const storedLanguage = localStorage.getItem('lifo-language-preference')
      if (storedLanguage) {
        try {
          const parsed = JSON.parse(storedLanguage)
          if (parsed.state?.currentLanguage && parsed.state.currentLanguage !== 'fr') {
            // Load the stored visitor language immediately
            loadMessagesCallback(parsed.state.currentLanguage)
            return
          }
        } catch {
          // Invalid stored data, continue to browser detection
        }
      }

      // Check browser language if no stored preference
      const browserLang = navigator.language.split('-')[0]
      if (['en', 'nl'].includes(browserLang) && browserLang !== 'fr') {
        loadMessagesCallback(browserLang)
        return
      }
    }

    // Normal language change handling (only when language actually changes)
    if (isHydrated) {
      loadMessagesCallback(currentLanguage)
    }
  }, [currentLanguage, isHydrated, loadMessagesCallback])

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
