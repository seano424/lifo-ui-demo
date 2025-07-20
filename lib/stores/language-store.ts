import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { updateUserLanguagePreference } from '@/lib/queries/users'
import { createClient } from '@/lib/supabase/client'

export type Language = 'fr' | 'en' | 'nl'

const LIFO_SUPPORTED_LANGUAGES = ['fr', 'en', 'nl'] as const

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
      currentLanguage: 'fr', // Default to French

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
            const savedLanguage = metadata.language_preference as Language

            if (savedLanguage && LIFO_SUPPORTED_LANGUAGES.includes(savedLanguage as Language)) {
              set({ currentLanguage: savedLanguage as Language })
            } else {
              // Default to French if no preference found
              set({ currentLanguage: 'fr' })
            }
          } else {
            // Not logged in - check localStorage first, then browser language
            const stored = localStorage.getItem('lifo-language-preference')
            if (stored) {
              try {
                const parsed = JSON.parse(stored)
                const storedLang = parsed.state?.currentLanguage as Language
                if (storedLang && LIFO_SUPPORTED_LANGUAGES.includes(storedLang)) {
                  set({ currentLanguage: storedLang })
                  return
                }
              } catch {
                // Invalid stored data, continue to browser detection
              }
            }

            // Use browser language or default to French
            const browserLang = navigator.language.split('-')[0] as Language
            const supportedLanguage = LIFO_SUPPORTED_LANGUAGES.includes(browserLang)
              ? browserLang
              : 'fr'

            set({ currentLanguage: supportedLanguage })
          }
        } catch (error) {
          console.error('Failed to initialize language:', error)
          set({ currentLanguage: 'fr' }) // Fallback to French
        } finally {
          set({ isLoading: false })
        }
      },

      resetLanguage: () => {
        set({ currentLanguage: 'fr', isLoading: false })
      },
    }),
    {
      name: 'lifo-language-preference',
      // Only persist the current language in localStorage for fast loading
      partialize: state => ({ currentLanguage: state.currentLanguage }),
    },
  ),
)
