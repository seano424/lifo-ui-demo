import { z } from 'zod'

// ============================================
// business.store_settings JSONB schemas
// ============================================

// 1. scoring_weights
export const scoringWeightsSchema = z.object({
  expiry: z.number(),
  margin: z.number(),
  velocity: z.number(),
})
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  expiry: 0.5,
  margin: 0.2,
  velocity: 0.3,
}

// 2. notification_preferences
export const notificationPreferencesSchema = z.object({
  sms_alerts: z.boolean(),
  alert_types: z.array(z.string()),
  email_alerts: z.boolean(),
  push_notifications: z.boolean(),
})
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  sms_alerts: false,
  alert_types: ['critical_expiry', 'low_stock', 'system_updates'],
  email_alerts: true,
  push_notifications: true,
}

// 3. display_preferences
export const displayPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
  date_format: z.string(),
  time_format: z.enum(['12h', '24h']),
})
export type DisplayPreferences = z.infer<typeof displayPreferencesSchema>

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  theme: 'light',
  language: 'en',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
}

// 4. backup_preferences
export const backupPreferencesSchema = z.object({
  auto_backup: z.boolean(),
  retention_days: z.number(),
  backup_frequency: z.enum(['daily', 'weekly', 'monthly']),
})
export type BackupPreferences = z.infer<typeof backupPreferencesSchema>

export const DEFAULT_BACKUP_PREFERENCES: BackupPreferences = {
  auto_backup: true,
  retention_days: 30,
  backup_frequency: 'daily',
}

// 5. opening_hours
const dayHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
})
export const openingHoursSchema = z.object({
  monday: dayHoursSchema.optional(),
  tuesday: dayHoursSchema.optional(),
  wednesday: dayHoursSchema.optional(),
  thursday: dayHoursSchema.optional(),
  friday: dayHoursSchema.optional(),
  saturday: dayHoursSchema.optional(),
  sunday: dayHoursSchema.optional(),
})
export type OpeningHours = z.infer<typeof openingHoursSchema>
export type DayHours = z.infer<typeof dayHoursSchema>

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { open: '08:00', close: '20:00' },
  tuesday: { open: '08:00', close: '20:00' },
  wednesday: { open: '08:00', close: '20:00' },
  thursday: { open: '08:00', close: '20:00' },
  friday: { open: '08:00', close: '20:00' },
  saturday: { open: '09:00', close: '18:00' },
  sunday: { open: '10:00', close: '16:00' },
}

// 6. peak_hours
export const peakHoursSchema = z.object({
  morning: z.string().optional(),
  afternoon: z.string().optional(),
  evening: z.string().optional(),
})
export type PeakHours = z.infer<typeof peakHoursSchema>

export const DEFAULT_PEAK_HOURS: PeakHours = {
  morning: '08:00-10:00',
  evening: '17:00-19:00',
}

// 7. batch_tracking_config
const automationScheduleSchema = z.object({
  enabled: z.boolean(),
  run_time: z.string(),
  days: z.array(z.string()),
})
export const batchTrackingConfigSchema = z.object({
  enabled: z.boolean(),
  setup_completed: z.boolean(),
  setup_completed_at: z.string().nullable(),
  product_selection_mode: z.string().nullable(),
  selected_category_ids: z.array(z.string()),
  selected_product_ids: z.array(z.string()),
  automation_schedule: automationScheduleSchema,
})
export type BatchTrackingConfig = z.infer<typeof batchTrackingConfigSchema>
export type AutomationSchedule = z.infer<typeof automationScheduleSchema>

export const DEFAULT_BATCH_TRACKING_CONFIG: BatchTrackingConfig = {
  enabled: false,
  setup_completed: false,
  setup_completed_at: null,
  product_selection_mode: null,
  selected_category_ids: [],
  selected_product_ids: [],
  automation_schedule: {
    enabled: false,
    run_time: '08:30',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  },
}

// 8. donation_preference_config
export const donationPreferenceConfigSchema = z.object({
  strategy: z.enum(['balanced', 'donation_first', 'discount_first']),
  show_reasoning: z.boolean(),
  blocked_recipients: z.array(z.string()),
  margin_sensitivity: z.number(),
  tax_deduction_rate: z.number(),
  auto_donate_enabled: z.boolean(),
  excluded_categories: z.array(z.string()),
  min_value_threshold: z.number(),
  critical_expiry_days: z.number(),
  preferred_recipients: z.array(z.string()),
  max_days_before_expiry: z.number(),
  max_value_per_donation: z.number(),
  min_days_before_expiry: z.number(),
  bulk_quantity_threshold: z.number(),
  enable_tax_calculations: z.boolean(),
  min_margin_for_discount: z.number(),
  small_quantity_fallback: z.enum(['discount', 'donate', 'dispose']),
  donation_first_threshold: z.number(),
  force_donation_categories: z.array(z.string()),
  min_quantity_for_donation: z.number(),
  require_user_confirmation: z.boolean(),
  donation_weight_multiplier: z.number(),
  european_disposal_threshold: z.number(),
  include_recipient_suggestions: z.boolean(),
})
export type DonationPreferenceConfig = z.infer<typeof donationPreferenceConfigSchema>

export const DEFAULT_DONATION_PREFERENCE_CONFIG: DonationPreferenceConfig = {
  strategy: 'balanced',
  show_reasoning: true,
  blocked_recipients: [],
  margin_sensitivity: 1.0,
  tax_deduction_rate: 60.0,
  auto_donate_enabled: false,
  excluded_categories: ['fresh_meat_fish', 'alcohol_tobacco'],
  min_value_threshold: 10.0,
  critical_expiry_days: 1,
  preferred_recipients: ['food_bank', 'soup_kitchen', 'charity'],
  max_days_before_expiry: 7,
  max_value_per_donation: 500.0,
  min_days_before_expiry: 1,
  bulk_quantity_threshold: 50.0,
  enable_tax_calculations: true,
  min_margin_for_discount: 40.0,
  small_quantity_fallback: 'discount',
  donation_first_threshold: 0.6,
  force_donation_categories: [],
  min_quantity_for_donation: 1.0,
  require_user_confirmation: true,
  donation_weight_multiplier: 1.0,
  european_disposal_threshold: 35.0,
  include_recipient_suggestions: true,
}

// ============================================
// business.store_users JSONB schemas
// ============================================

// 9. permissions
export const storeUserPermissionsSchema = z.object({
  // Core permissions
  can_view_analytics: z.boolean().optional(),
  can_apply_discounts: z.boolean().optional(),
  can_upload_inventory: z.boolean().optional(),

  // Settings permissions
  can_manage_settings: z.boolean().optional(),
  can_view_settings: z.boolean().optional(),
  can_edit_basic_info: z.boolean().optional(),
  can_edit_advanced_settings: z.boolean().optional(),
  can_edit_ai_settings: z.boolean().optional(),

  // Team management
  can_manage_team: z.boolean().optional(),
  can_manage_users: z.boolean().optional(),

  // Scanning permissions
  can_scan_products: z.boolean().optional(),
  can_scan_in: z.boolean().optional(),
  can_scan_out: z.boolean().optional(),

  // Inventory permissions
  can_view_basic_inventory: z.boolean().optional(),
})
export type StoreUserPermissions = z.infer<typeof storeUserPermissionsSchema>

export const DEFAULT_STORE_USER_PERMISSIONS: StoreUserPermissions = {
  can_view_analytics: true,
  can_apply_discounts: false,
  can_upload_inventory: true,
}

// ============================================
// Export all schemas for validation use
// ============================================
export const jsonbSchemas = {
  // store_settings
  scoringWeights: scoringWeightsSchema,
  notificationPreferences: notificationPreferencesSchema,
  displayPreferences: displayPreferencesSchema,
  backupPreferences: backupPreferencesSchema,
  openingHours: openingHoursSchema,
  peakHours: peakHoursSchema,
  batchTrackingConfig: batchTrackingConfigSchema,
  donationPreferenceConfig: donationPreferenceConfigSchema,
  // store_users
  storeUserPermissions: storeUserPermissionsSchema,
} as const
