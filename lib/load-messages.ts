/**
 * Shared utility to load and merge translation files from folder structure
 * Used by both server-side (i18n.ts) and client-side (intl-provider.tsx)
 */

// Cache for loaded translation messages to avoid repeated file loading
const messageCache = new Map<string, Record<string, unknown>>()

/**
 * Clear the message cache - useful for development or when translations are updated
 */
export function clearMessageCache(): void {
  messageCache.clear()
  console.log('Message cache cleared - translations will be reloaded')
}

/**
 * Load and merge translation files for a given locale
 *
 * @param locale - The locale to load translations for (e.g., 'en', 'fr', 'nl')
 * @returns Promise resolving to merged translation object
 *
 * Performance optimizations:
 * - Uses in-memory cache to avoid repeated file loading
 * - Loads all translation files in parallel
 * - Caches result for subsequent calls
 */
export async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  const cacheKey = locale

  // Return cached messages if available
  if (messageCache.has(cacheKey)) {
    return messageCache.get(cacheKey)!
  }
  try {
    // Import all translation files for the locale and merge them
    const [
      auth,
      common,
      dashboard,
      dashboardAdmin,
      dashboardData,
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
      import(`../messages/${locale}/dashboard-admin.json`).then(m => m.default).catch(() => ({})),
      import(`../messages/${locale}/dashboard-data.json`).then(m => m.default).catch(() => ({})),
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

    // Merge all messages into a single object with proper namespacing
    const messages = {
      ...auth,
      ...common,
      ...dashboard,
      ...dashboardAdmin,
      ...dashboardData,
      inventory,
      // Also expose inventory subkeys at root level for backward compatibility
      batches: inventory.batches,
      batchSort: inventory.batchSort,
      batchFilters: inventory.batchFilters,
      products: inventory.products,
      deliveries: inventory.deliveries,
      manualDelivery: inventory.manualDelivery,
      scanningCamera: inventory.scanningCamera,
      scanningWorkflow: inventory.scanningWorkflow,
      scanningInterface: inventory.scanningInterface,
      inventoryForm: inventory.inventoryForm,
      productCard: inventory.productCard,
      scannedItemsList: inventory.scannedItemsList,
      csvUpload: inventory.csvUpload,
      store: inventory.store,
      ...marketing,
      ...onboarding,
      ...settings,
      todos,
      ocr,
      donation,
      ...terms,
      ...privacy,
    }

    // Cache the loaded messages
    messageCache.set(cacheKey, messages)
    return messages
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
