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
