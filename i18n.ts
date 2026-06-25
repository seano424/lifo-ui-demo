import { createServerClient } from '@supabase/ssr'
import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { loadMessages } from './lib/load-messages'
import { isSupportedLocale, type SupportedLocale } from './types/i18n'

async function detectLanguageFromHeaders(): Promise<SupportedLocale> {
  try {
    const headersList = await headers()
    const acceptLanguage = headersList.get('accept-language')

    if (!acceptLanguage) return 'en'

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,fr;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map((lang: string) => {
        const [locale, q = 'q=1'] = lang.trim().split(';')
        const quality = parseFloat(q.split('=')[1] || '1')
        return { locale: locale.split('-')[0], quality }
      })
      .sort(
        (a: { locale: string; quality: number }, b: { locale: string; quality: number }) =>
          b.quality - a.quality,
      )

    // Find first supported language
    for (const { locale } of languages) {
      if (isSupportedLocale(locale)) {
        return locale
      }
    }

    return 'en'
  } catch {
    return 'en'
  }
}

export default getRequestConfig(async () => {
  // 1. Start with header-based detection
  let locale = await detectLanguageFromHeaders()

  try {
    const cookieStore = await cookies()
    let resolvedFromSupabase = false

    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      // 2. Try to get user's saved preference from Supabase
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(_cookiesToSet) {
              // No-op in server context during static generation
            },
          },
        },
      )

      const {
        data: { user },
      } = await supabase.auth.getUser()

      // 3. User preference takes precedence
      if (user?.user_metadata?.language_preference) {
        const userLang = user.user_metadata.language_preference
        if (isSupportedLocale(userLang)) {
          locale = userLang
          resolvedFromSupabase = true
        }
      }
    }

    // 4. For non-authenticated users (or demo mode), try to read from the language preference cookie
    if (!resolvedFromSupabase) {
      const langCookie = cookieStore.get('lifo-language-preference')
      if (langCookie?.value) {
        try {
          const parsed = JSON.parse(langCookie.value)
          const storedLang = parsed.state?.currentLanguage
          if (storedLang && isSupportedLocale(storedLang)) {
            locale = storedLang
          }
        } catch {
          // Invalid cookie data, continue with header detection
        }
      }
    }
  } catch (error) {
    // Fallback to detected/default locale if Supabase fails
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to get user language preference:', error)
    }
  }

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: 'Europe/Paris',
    onError(_error) {
      if (process.env.NODE_ENV === 'development') {
      }
    },
    getMessageFallback({ namespace, key, error }) {
      const path = [namespace, key].filter(part => part != null).join('.')
      return `${path} (${error.code})`
    },
  }
})
