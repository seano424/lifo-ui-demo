import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  // Default to French since it's our primary language
  const locale = 'fr'

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
