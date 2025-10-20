/**
 * Shared utility to load and merge translation files from folder structure
 * Used by both server-side (i18n.ts) and client-side (intl-provider.tsx)
 */

export async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  try {
    // Import all translation files for the locale and merge them
    const [
      auth,
      common,
      dashboard,
      inventory,
      marketing,
      onboarding,
      settings,
      todos,
      ocr,
      donation,
      terms,
      privacy,
    ] = await Promise.all([
      import(`../messages/${locale}/auth.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/common.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/dashboard.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/inventory.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/marketing.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/onboarding.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/settings.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/todos.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/ocr.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/donation.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/terms.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/privacy.json`).then(m => m.default).catch(() => ({})),
    ])

    // Merge all messages into a single object
    return {
      ...auth,
      ...common,
      ...dashboard,
      ...inventory,
      ...marketing,
      ...onboarding,
      ...settings,
      todos,
      ocr,
      donation,
      ...terms,
      ...privacy,
    }
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error)

    // Fallback to French
    if (locale !== 'fr') {
      return loadMessages('fr')
    }

    // If French also fails, return empty object
    return {}
  }
}
