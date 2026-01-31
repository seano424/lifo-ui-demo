/**
 * Internationalization type definitions
 * Shared across the application for consistent locale handling
 */

export type SupportedLocale = 'en' | 'fr' | 'nl'

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en', 'fr', 'nl'] as const

/**
 * Type guard to check if a string is a valid supported locale
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}
