import type { MergeDeep } from 'type-fest'
import type { Database as GeneratedDatabase, Json } from './supabase'
import type {
  ScoringWeights,
  NotificationPreferences,
  DisplayPreferences,
  BackupPreferences,
  OpeningHours,
  PeakHours,
  BatchTrackingConfig,
  DonationPreferenceConfig,
  StoreUserPermissions,
} from '@/lib/schemas/jsonb-schemas'

// Extended Database type with properly typed JSONB columns
export type Database = MergeDeep<
  GeneratedDatabase,
  {
    business: {
      Tables: {
        store_settings: {
          Row: {
            scoring_weights: ScoringWeights | null
            notification_preferences: NotificationPreferences | null
            display_preferences: DisplayPreferences | null
            backup_preferences: BackupPreferences | null
            opening_hours: OpeningHours | null
            peak_hours: PeakHours | null
            batch_tracking_config: BatchTrackingConfig | null
            donation_preference_config: DonationPreferenceConfig | null
          }
          Insert: {
            scoring_weights?: ScoringWeights | null
            notification_preferences?: NotificationPreferences | null
            display_preferences?: DisplayPreferences | null
            backup_preferences?: BackupPreferences | null
            opening_hours?: OpeningHours | null
            peak_hours?: PeakHours | null
            batch_tracking_config?: BatchTrackingConfig | null
            donation_preference_config?: DonationPreferenceConfig | null
          }
          Update: {
            scoring_weights?: ScoringWeights | null
            notification_preferences?: NotificationPreferences | null
            display_preferences?: DisplayPreferences | null
            backup_preferences?: BackupPreferences | null
            opening_hours?: OpeningHours | null
            peak_hours?: PeakHours | null
            batch_tracking_config?: BatchTrackingConfig | null
            donation_preference_config?: DonationPreferenceConfig | null
          }
        }
        store_users: {
          Row: {
            permissions: StoreUserPermissions | null
          }
          Insert: {
            permissions?: StoreUserPermissions | null
          }
          Update: {
            permissions?: StoreUserPermissions | null
          }
        }
      }
    }
  }
>

// Re-export the original for cases where you need it
export type { GeneratedDatabase, Json }

// Convenience exports - direct type access for JSONB-enhanced tables
export type StoreSettings = Database['business']['Tables']['store_settings']['Row']
export type StoreUser = Database['business']['Tables']['store_users']['Row']
