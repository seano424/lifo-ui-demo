export function detectBrowserLanguage(): string {
  if (typeof window === 'undefined') return 'fr'

  const browserLang = navigator.language || navigator.languages?.[0]

  // Extract language code (e.g., 'en-US' -> 'en')
  const langCode = browserLang?.split('-')[0] || 'fr'

  // Return supported language or default to French
  return ['en', 'fr'].includes(langCode) ? langCode : 'fr'
}

export function detectTimezone(): string {
  if (typeof window === 'undefined') return 'Europe/Paris'

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'Europe/Paris'
  }
}

export function getLanguageFromTimezone(timezone: string): string {
  // Map common European timezones to languages
  const timezoneToLanguage: Record<string, string> = {
    'Europe/London': 'en',
    'Europe/Dublin': 'en',
    'America/New_York': 'en',
    'America/Los_Angeles': 'en',
    'America/Chicago': 'en',
    'Europe/Paris': 'fr',
    'Europe/Brussels': 'fr',
    'Europe/Luxembourg': 'fr',
    'Africa/Casablanca': 'fr',
    'America/Montreal': 'fr',
  }

  return timezoneToLanguage[timezone] || 'fr'
}
