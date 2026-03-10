import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { updateUserLanguagePreference } from '@/lib/queries/users'
import { createClient } from '@/lib/supabase/client'
import { isSupportedLocale, type SupportedLocale } from '@/types/i18n'

export type Language = SupportedLocale

interface LanguageState {
  currentLanguage: Language
  isLoading: boolean
  setLanguage: (language: Language) => Promise<void>
  initializeLanguage: () => Promise<void>
  resetLanguage: () => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    set => ({
      currentLanguage: 'en', // Default to English

      isLoading: false,

      setLanguage: async (language: Language) => {
        set({ isLoading: true })

        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            // Use the existing language preference update function
            await updateUserLanguagePreference(user.id, language)
          }

          // Update local state
          set({ currentLanguage: language })

          // No need to reload page - our IntlProvider will handle the dynamic switching
        } catch (error) {
          console.error('Failed to update language preference:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      initializeLanguage: async () => {
        set({ isLoading: true })

        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            // Get user's language preference from user_metadata
            const metadata = user.user_metadata || {}
            const savedLanguage = metadata.language_preference

            if (savedLanguage && isSupportedLocale(savedLanguage)) {
              set({ currentLanguage: savedLanguage })
            } else {
              // Default to English if no preference found
              set({ currentLanguage: 'en' })
            }
          } else {
            // Not logged in - check localStorage first, then browser language
            const stored = localStorage.getItem('lifo-language-preference')
            if (stored) {
              try {
                const parsed = JSON.parse(stored)
                const storedLang = parsed.state?.currentLanguage
                if (storedLang && isSupportedLocale(storedLang)) {
                  set({ currentLanguage: storedLang })
                  return
                }
              } catch {
                // Invalid stored data, continue to browser detection
              }
            }

            // Use browser language or default to French
            const browserLang = navigator.language.split('-')[0]
            const supportedLanguage = isSupportedLocale(browserLang) ? browserLang : 'en'

            set({ currentLanguage: supportedLanguage })
          }
        } catch (error) {
          console.error('Failed to initialize language:', error)
          set({ currentLanguage: 'en' }) // Fallback to English
        } finally {
          set({ isLoading: false })
        }
      },

      resetLanguage: () => {
        set({ currentLanguage: 'en', isLoading: false })
      },
    }),
    {
      name: 'lifo-language-preference',
      // Only persist the current language in localStorage for fast loading
      partialize: state => ({ currentLanguage: state.currentLanguage }),
    },
  ),
)
