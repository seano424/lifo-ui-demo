import {
  scoringWeightsSchema,
  notificationPreferencesSchema,
  displayPreferencesSchema,
  backupPreferencesSchema,
  openingHoursSchema,
  peakHoursSchema,
  batchTrackingConfigSchema,
  donationPreferenceConfigSchema,
  storeUserPermissionsSchema,
  type ScoringWeights,
  type NotificationPreferences,
  type DisplayPreferences,
  type BackupPreferences,
  type OpeningHours,
  type PeakHours,
  type BatchTrackingConfig,
  type DonationPreferenceConfig,
  type StoreUserPermissions,
} from '@/lib/schemas/jsonb-schemas'

// ============================================
// Parse functions (throw on invalid data)
// ============================================

export const parseJsonb = {
  scoringWeights: (data: unknown): ScoringWeights => scoringWeightsSchema.parse(data),
  notificationPreferences: (data: unknown): NotificationPreferences =>
    notificationPreferencesSchema.parse(data),
  displayPreferences: (data: unknown): DisplayPreferences => displayPreferencesSchema.parse(data),
  backupPreferences: (data: unknown): BackupPreferences => backupPreferencesSchema.parse(data),
  openingHours: (data: unknown): OpeningHours => openingHoursSchema.parse(data),
  peakHours: (data: unknown): PeakHours => peakHoursSchema.parse(data),
  batchTrackingConfig: (data: unknown): BatchTrackingConfig =>
    batchTrackingConfigSchema.parse(data),
  donationPreferenceConfig: (data: unknown): DonationPreferenceConfig =>
    donationPreferenceConfigSchema.parse(data),
  storeUserPermissions: (data: unknown): StoreUserPermissions =>
    storeUserPermissionsSchema.parse(data),
}

// ============================================
// SafeParse functions (return result object)
// ============================================

export const safeParseJsonb = {
  scoringWeights: (data: unknown) => scoringWeightsSchema.safeParse(data),
  notificationPreferences: (data: unknown) => notificationPreferencesSchema.safeParse(data),
  displayPreferences: (data: unknown) => displayPreferencesSchema.safeParse(data),
  backupPreferences: (data: unknown) => backupPreferencesSchema.safeParse(data),
  openingHours: (data: unknown) => openingHoursSchema.safeParse(data),
  peakHours: (data: unknown) => peakHoursSchema.safeParse(data),
  batchTrackingConfig: (data: unknown) => batchTrackingConfigSchema.safeParse(data),
  donationPreferenceConfig: (data: unknown) => donationPreferenceConfigSchema.safeParse(data),
  storeUserPermissions: (data: unknown) => storeUserPermissionsSchema.safeParse(data),
}

// ============================================
// Partial parse for updates
// ============================================

export const parsePartialJsonb = {
  scoringWeights: (data: unknown) => scoringWeightsSchema.partial().parse(data),
  notificationPreferences: (data: unknown) => notificationPreferencesSchema.partial().parse(data),
  displayPreferences: (data: unknown) => displayPreferencesSchema.partial().parse(data),
  backupPreferences: (data: unknown) => backupPreferencesSchema.partial().parse(data),
  openingHours: (data: unknown) => openingHoursSchema.partial().parse(data),
  peakHours: (data: unknown) => peakHoursSchema.partial().parse(data),
  batchTrackingConfig: (data: unknown) => batchTrackingConfigSchema.partial().parse(data),
  donationPreferenceConfig: (data: unknown) => donationPreferenceConfigSchema.partial().parse(data),
  storeUserPermissions: (data: unknown) => storeUserPermissionsSchema.partial().parse(data),
}

// ============================================
// Type guards for runtime type checking
// ============================================

export function isValidScoringWeights(value: unknown): value is ScoringWeights {
  return safeParseJsonb.scoringWeights(value).success
}

export function isValidNotificationPreferences(value: unknown): value is NotificationPreferences {
  return safeParseJsonb.notificationPreferences(value).success
}

export function isValidDisplayPreferences(value: unknown): value is DisplayPreferences {
  return safeParseJsonb.displayPreferences(value).success
}

export function isValidBackupPreferences(value: unknown): value is BackupPreferences {
  return safeParseJsonb.backupPreferences(value).success
}

export function isValidOpeningHours(value: unknown): value is OpeningHours {
  return safeParseJsonb.openingHours(value).success
}

export function isValidPeakHours(value: unknown): value is PeakHours {
  return safeParseJsonb.peakHours(value).success
}

export function isValidBatchTrackingConfig(value: unknown): value is BatchTrackingConfig {
  return safeParseJsonb.batchTrackingConfig(value).success
}

export function isValidDonationPreferenceConfig(value: unknown): value is DonationPreferenceConfig {
  return safeParseJsonb.donationPreferenceConfig(value).success
}

export function isValidStoreUserPermissions(value: unknown): value is StoreUserPermissions {
  return safeParseJsonb.storeUserPermissions(value).success
}

// ============================================
// Assertion functions for type narrowing
// ============================================

export function assertScoringWeights(value: unknown): asserts value is ScoringWeights {
  const result = safeParseJsonb.scoringWeights(value)
  if (!result.success) {
    throw new Error(`Invalid scoring weights: ${result.error.message}`)
  }
}

export function assertNotificationPreferences(
  value: unknown,
): asserts value is NotificationPreferences {
  const result = safeParseJsonb.notificationPreferences(value)
  if (!result.success) {
    throw new Error(`Invalid notification preferences: ${result.error.message}`)
  }
}

export function assertDisplayPreferences(value: unknown): asserts value is DisplayPreferences {
  const result = safeParseJsonb.displayPreferences(value)
  if (!result.success) {
    throw new Error(`Invalid display preferences: ${result.error.message}`)
  }
}

export function assertBackupPreferences(value: unknown): asserts value is BackupPreferences {
  const result = safeParseJsonb.backupPreferences(value)
  if (!result.success) {
    throw new Error(`Invalid backup preferences: ${result.error.message}`)
  }
}

export function assertOpeningHours(value: unknown): asserts value is OpeningHours {
  const result = safeParseJsonb.openingHours(value)
  if (!result.success) {
    throw new Error(`Invalid opening hours: ${result.error.message}`)
  }
}

export function assertPeakHours(value: unknown): asserts value is PeakHours {
  const result = safeParseJsonb.peakHours(value)
  if (!result.success) {
    throw new Error(`Invalid peak hours: ${result.error.message}`)
  }
}

export function assertBatchTrackingConfig(value: unknown): asserts value is BatchTrackingConfig {
  const result = safeParseJsonb.batchTrackingConfig(value)
  if (!result.success) {
    throw new Error(`Invalid batch tracking config: ${result.error.message}`)
  }
}

export function assertDonationPreferenceConfig(
  value: unknown,
): asserts value is DonationPreferenceConfig {
  const result = safeParseJsonb.donationPreferenceConfig(value)
  if (!result.success) {
    throw new Error(`Invalid donation preference config: ${result.error.message}`)
  }
}

export function assertStoreUserPermissions(value: unknown): asserts value is StoreUserPermissions {
  const result = safeParseJsonb.storeUserPermissions(value)
  if (!result.success) {
    throw new Error(`Invalid store user permissions: ${result.error.message}`)
  }
}
