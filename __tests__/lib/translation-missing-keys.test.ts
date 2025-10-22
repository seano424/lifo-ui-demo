import fs from 'node:fs'
import path from 'node:path'

describe('Missing Translation Keys', () => {
  const supportedLocales = ['en', 'fr', 'nl']
  const translationFiles = [
    'auth.json',
    'common.json',
    'dashboard.json',
    'inventory.json',
    'marketing.json',
    'onboarding.json',
    'settings.json',
    'todos.json',
    'ocr.json',
    'donation.json',
    'terms.json',
    'privacy.json',
  ]

  // Helper function to get all keys from a nested object
  function getAllKeys(obj: any, prefix = ''): string[] {
    let keys: string[] = []

    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          keys = keys.concat(getAllKeys(obj[key], fullKey))
        } else {
          keys.push(fullKey)
        }
      }
    }

    return keys
  }

  // Helper function to load translation file
  function loadTranslationFile(locale: string, filename: string): any {
    const filePath = path.join(process.cwd(), 'messages', locale, filename)

    if (!fs.existsSync(filePath)) {
      return {}
    }

    const content = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  }

  it('should have consistent keys across all languages', () => {
    const allIssues: string[] = []

    translationFiles.forEach(filename => {
      const allLocaleKeys: { [locale: string]: string[] } = {}

      // Load all translations for this file
      supportedLocales.forEach(locale => {
        const translations = loadTranslationFile(locale, filename)
        allLocaleKeys[locale] = getAllKeys(translations)
      })

      // Use English as the base reference
      const baseLocale = 'en'
      const baseKeys = allLocaleKeys[baseLocale]

      // Check each locale against the base
      supportedLocales.forEach(locale => {
        if (locale === baseLocale) return

        const localeKeys = allLocaleKeys[locale]

        // Find missing and extra keys
        const missingKeys = baseKeys.filter(key => !localeKeys.includes(key))
        const extraKeys = localeKeys.filter(key => !baseKeys.includes(key))

        if (missingKeys.length > 0) {
          allIssues.push(
            `❌ ${locale}/${filename} - Missing ${missingKeys.length} keys: ${missingKeys.join(', ')}`,
          )
        }

        if (extraKeys.length > 0) {
          allIssues.push(
            `⚠️ ${locale}/${filename} - Extra ${extraKeys.length} keys: ${extraKeys.join(', ')}`,
          )
        }
      })
    })

    // Print all issues for easy debugging
    if (allIssues.length > 0) {
      console.log('\n🔍 Translation Key Issues Found:')
      console.log('================================')
      allIssues.forEach(issue => console.log(issue))
      console.log('')
    }

    // Fail the test if there are missing keys (but allow extra keys as warnings)
    const missingKeyIssues = allIssues.filter(issue => issue.includes('❌'))
    expect(missingKeyIssues).toHaveLength(0)
  })
})
