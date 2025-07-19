import { useLanguageStore } from '@/lib/stores/language-store'

export function useLanguage() {
  const { currentLanguage, setLanguage, isLoading } = useLanguageStore()

  return {
    currentLanguage,
    setLanguage,
    isLoading,
    isEnglish: currentLanguage === 'en',
    isFrench: currentLanguage === 'fr',
    isDutch: currentLanguage === 'nl',
  }
}
