import { getRequestConfig } from 'next-intl/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  let locale = 'fr' // Default to French

  try {
    // Try to get user's language preference from Supabase
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // No-op in server context
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.user_metadata?.language_preference) {
      const userLang = user.user_metadata.language_preference
      // Ensure the locale is one we support
      if (['en', 'fr'].includes(userLang)) {
        locale = userLang
      }
    }
  } catch (error) {
    // If anything fails, stick with French default
    console.warn('Failed to get user language preference:', error)
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    // Add timezone configuration to prevent environment fallback warnings
    timeZone: 'Europe/Paris',
    // Provide fallback for missing translations
    onError(error) {
      console.warn('i18n error:', error.message)
    },
    getMessageFallback({ namespace, key, error }) {
      const path = [namespace, key].filter(part => part != null).join('.')
      return `${path} (${error.code})`
    },
  }
})
