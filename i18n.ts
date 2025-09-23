import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { loadMessages } from './lib/load-messages'

async function detectLanguageFromHeaders(): Promise<string> {
  try {
    const headersList = await headers()
    const acceptLanguage = headersList.get('accept-language')

    if (!acceptLanguage) return 'fr'

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
      if (['en', 'fr', 'nl'].includes(locale)) {
        return locale
      }
    }

    return 'fr'
  } catch {
    return 'fr'
  }
}

export default getRequestConfig(async () => {
  // 1. Start with header-based detection
  let locale = await detectLanguageFromHeaders()

  try {
    // 2. Try to get user's saved preference from Supabase
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      if (['en', 'fr', 'nl'].includes(userLang)) {
        locale = userLang
      }
    } else {
      // 4. For non-authenticated users, try to read from the language preference cookie
      const langCookie = cookieStore.get('lifo-language-preference')
      if (langCookie?.value) {
        try {
          const parsed = JSON.parse(langCookie.value)
          const storedLang = parsed.state?.currentLanguage
          if (storedLang && ['en', 'fr', 'nl'].includes(storedLang)) {
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
