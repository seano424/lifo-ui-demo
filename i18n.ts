import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  // Default to French since it's our primary language
  const locale = 'fr'

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
      const path = [namespace, key].filter((part) => part != null).join('.')
      return `${path} (${error.code})`
    },
  }
})
