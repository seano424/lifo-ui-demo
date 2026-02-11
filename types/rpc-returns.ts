/**
 * LIFO.AI - Supabase RPC Function Types
 * Auto-generated from database function definitions
 * Last updated: 2026-02-03
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

/** Standard success/error response pattern used by most RPCs */
export interface RpcSuccessResponse {
  success: true
}

export interface RpcErrorResponse {
  success: false
  error?: string
  error_code?: string
  message?: string
}

export type RpcResponse<T> = (T & RpcSuccessResponse) | RpcErrorResponse

/** Action types enum - matches public.action_type */
export type ActionType = 'discount' | 'donate' | 'dispose' | 'sold' | 'maintain' | 'ignored'

/** Urgency levels for batch scoring */
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'none'

/** Sale timing options */
export type SaleTiming = 'just-now' | 'today' | 'yesterday' | 'this-week' | 'custom'

/** Batch status values */
export type BatchStatus =
  | 'draft'
  | 'active'
  | 'ignored'
  | 'expired'
  | 'sold_out'
  | 'depleted'
  | 'donated'
  | 'disposed'

/** Lifecycle status values */
export type LifecycleStatus = 'active' | 'expired'

/** Completion status for todos */
export type CompletionStatus = 'pending' | 'in_progress' | 'completed'

/** Store user roles */
export type StoreRole = 'owner' | 'manager' | 'employee' | 'staff'

// =============================================================================
// AUTHENTICATION SCHEMA
// =============================================================================

export interface ValidatePinLoginResult {
  success: boolean
  user: {
    id: string
    email: string
    username: string
    full_name: string
    store_id: string
  }
  error?: string
  is_locked?: boolean
  attempts_remaining?: number
}

export interface CheckPinLockStatusResult {
  is_locked: boolean
}

// =============================================================================
// INVENTORY SCHEMA - BATCH QUANTITY UPDATES
// =============================================================================

/** Single item for batch_update_quantities input */
export interface BatchUpdateItem {
  batch_id: string
  quantity: number
  action_type?: ActionType
  action_reason?: string
  discount_percentage?: number
  donation_recipient_id?: string
  disposal_reason?: string
  notes?: string
}

/** Single result from batch_update_quantities */
export interface BatchUpdateResult {
  batch_id: string
  new_quantity: number
  available_quantity?: number
  status: string
  success: boolean
  error_message?: string | null
}

/** Response from batch_update_quantities */
export interface BatchUpdateQuantitiesResponse {
  success: boolean
  processed_count: number
  store_id?: string
  timestamp?: string
  results: BatchUpdateResult[]
  error?: string
}

// =============================================================================
// INVENTORY SCHEMA - BATCH ACTIONS
// =============================================================================

/** Single action for record_batch_actions input */
export interface BatchAction {
  action_type: ActionType
  quantity: number
  discount_percentage?: number
  donation_recipient_id?: string
  disposal_reason?: string
  notes?: string
}

/** Response from record_batch_actions */
export interface RecordBatchActionsResponse {
  success: boolean
  batch_id?: string
  entries_created?: number
  total_quantity_processed?: number
  remaining_quantity?: number
  message?: string
  error?: string
  error_code?: string
}

/** Validation result from validate_batch_actions */
export interface ValidateBatchActionsResult {
  is_valid: boolean
  error_message: string
  available_quantity: number
  requested_quantity: number
}

// =============================================================================
// PUBLIC SCHEMA - ACTION EXECUTION
// =============================================================================

/** Response from execute_discount_action */
export interface ExecuteDiscountResponse {
  success: boolean
  action_id: string
  remaining_quantity: number
  potential_revenue: number
  discounted_price: number
}

/** Response from execute_donate_action */
export interface ExecuteDonateResponse {
  success: boolean
  action_id: string
  remaining_quantity: number
  original_value: number
  discount_applied: number | null
}

/** Response from execute_dispose_action */
export interface ExecuteDisposeResponse {
  success: boolean
  action_id: string
  remaining_quantity: number
  waste_value: number
  discount_applied: number | null
}

/** Response from execute_sold_action */
export interface ExecuteSoldResponse {
  success: boolean
  action_id: string
  remaining_quantity: number
  revenue_recovered: number
  discount_applied: number | null
  effective_price: number
  sale_timing: SaleTiming
  sale_occurred_at: string
}

/** Response from execute_dismiss_action */
export interface ExecuteDismissResponse {
  success: boolean
  message: string
}

/** Input params for execute_bulk_action */
export interface BulkActionParams {
  quantity?: number
  discount_percentage?: number
  recipient_id?: string
  reason?: string
  notes?: string
}

/** Response from execute_bulk_action */
export interface ExecuteBulkActionResponse {
  success: boolean
  total_processed: number
  success_count: number
  error_count: number
  results: Array<
    | ExecuteDiscountResponse
    | ExecuteDonateResponse
    | ExecuteDisposeResponse
    | ExecuteSoldResponse
    | { success: false; batch_id: string; error: string }
  >
}

// =============================================================================
// PUBLIC SCHEMA - BATCH UPDATES
// =============================================================================

/** Input updates for update_batch */
export interface UpdateBatchInput {
  expiry_date?: string
  manufacture_date?: string
  current_quantity?: number
  initial_quantity?: number
  cost_price?: number
  selling_price?: number
  location_code?: string
  supplier?: string
  batch_number?: string
  status?: BatchStatus
  verification_status?: string
}

/** Batch data returned from update_batch */
export interface UpdatedBatchData {
  batch_id: string
  batch_number: string
  product_id: string
  store_id: string
  expiry_date: string | null
  manufacture_date: string | null
  current_quantity: number
  initial_quantity: number
  available_quantity: number
  cost_price: number | null
  selling_price: number | null
  location_code: string | null
  supplier: string | null
  status: string
  verification_status: string | null
  created_at: string
  updated_at: string
}

/** Response from update_batch */
export interface UpdateBatchResponse {
  success: boolean
  data?: UpdatedBatchData
  error?: string
  error_code?: string
}

// =============================================================================
// PUBLIC SCHEMA - TODOS & FILTERING
// =============================================================================

/** Filter options for get_todos_with_counts and get_todos_with_filters */
export interface TodoFilters {
  completion_status?: CompletionStatus
  urgency_level?: UrgencyLevel[]
  action_type?: ActionType[]
  batch_status?: BatchStatus[]
  lifecycle_status?: LifecycleStatus[]
  product_name?: string
  days_to_expiry_min?: number
  days_to_expiry_max?: number
}

/** Response from get_todos_counts_with_filters */
export interface TodoCounts {
  pending: number
  in_progress: number
  completed: number
  expiring: number
  expired: number
}

/** Single todo item from get_todos_with_counts / get_todos_with_filters */
export interface TodoItem {
  batch_id: string
  store_id: string
  batch_number: string
  expiry_date: string | null
  current_quantity: number
  available_quantity: number
  lifecycle_status: string
  batch_status: string
  product_name: string
  product_brand: string | null
  ai_recommendation: ActionType | null
  composite_score: number | null
  urgency_level: UrgencyLevel | null
  ai_calculated_at: string | null
  last_action_type: ActionType | null
  last_action_time: string | null
  last_action_quantity: number | null
  last_discount_percent: number | null
  last_action_disposal_reason: string | null
  last_action_dismissal_reason: string | null
  last_action_sale_timing: SaleTiming | null
  last_action_sale_occurred_at: string | null
  last_action_recipient_id: string | null
  last_action_recipient_name: string | null
  last_action_notes: string | null
  total_actions_ever: number
  total_discounted_quantity: number
  total_donated_quantity: number
  total_disposed_quantity: number
  total_sold_quantity: number
  total_ignored_quantity: number
  cost_price: number | null
  selling_price: number | null
  current_selling_price: number | null
  profit_margin: number | null
  profit_margin_percent: number | null
  potential_loss_value: number | null
  potential_revenue_value: number | null
  current_total_value: number | null
  unit_price: number | null
  completion_status: CompletionStatus
  todo_state: string
  priority_order: number
  days_to_expiry: number
  hours_since_last_action: number | null
  view_refreshed_at: string
}

/** Extended todo item with counts (from paginated query) */
export interface TodoItemWithCounts extends TodoItem {
  total_count: number
  pending_count: number
  in_progress_count: number
  completed_count: number
  expiring_count: number
  expired_count: number
}

/** Response from get_batch_todo_by_id */
export type GetBatchTodoByIdResponse = TodoItem | null

// =============================================================================
// PUBLIC SCHEMA - BATCH TRACKING SETUP
// =============================================================================

/** Automation schedule configuration */
export interface AutomationSchedule {
  enabled: boolean
  run_time: string
  days: string[]
}

/** Batch tracking configuration */
export interface BatchTrackingConfig {
  enabled: boolean
  setup_completed: boolean
  setup_completed_at?: string
  product_selection_mode?: 'all' | 'by_category' | 'individual'
  selected_category_ids?: string[]
  selected_product_ids?: string[]
  automation_schedule?: AutomationSchedule
}

/** Category setting for batch tracking */
export interface CategoryTrackingSetting {
  category_id: string
  is_tracked: boolean
  auto_create_batches: boolean
  default_shelf_life_days: number | null
}

/** Response from get_batch_tracking_setup */
export interface BatchTrackingSetupResponse {
  config: BatchTrackingConfig
  category_settings: CategoryTrackingSetting[]
  product_override_count: number
  tracked_product_count: number
  automated_product_count: number
}

/** Product override for batch tracking setup */
export interface ProductTrackingOverride {
  product_id: string
  is_tracked_for_batches?: boolean
  shelf_life_override_days?: number
  auto_create_batches?: boolean
}

/** Response from save_batch_tracking_setup */
export type SaveBatchTrackingSetupResponse =
  | {
      success: true
      setup_completed: boolean
      categories_updated: number
      products_updated: number
    }
  | {
      success: false
      error: string
    }

/** Category with tracking settings from get_categories_with_tracking_settings */
export interface CategoryWithTrackingSettings {
  category_id: string
  category_code: string
  display_name_en: string
  display_name_fr: string
  typical_shelf_life_days: number | null
  is_tracked: boolean
  auto_create_batches: boolean
  default_shelf_life_days: number | null
  product_count: number
}

/** Product with tracking settings from get_products_for_tracking_setup */
export interface ProductWithTrackingSettings {
  product_id: string
  name: string
  brand: string | null
  barcode: string | null
  image_url: string | null
  category_id: string | null
  category_name: string | null
  typical_shelf_life_days: number | null
  is_tracked_for_batches: boolean
  shelf_life_override_days: number | null
  auto_create_batches: boolean | null
  inherited_auto_create: boolean
  inherited_shelf_life_days: number | null
  total_count: number
}

// =============================================================================
// USER_MGMT SCHEMA - GDPR & ACCOUNT DELETION
// =============================================================================

/** Response from request_account_deletion - Success case */
export interface RequestAccountDeletionSuccessResponse {
  success: true
  message: string
  deletion_scheduled_for: string
  grace_days: number
}

/** Response from request_account_deletion - Error case */
export interface RequestAccountDeletionErrorResponse {
  success: false
  message: string
}

/** Response from request_account_deletion - Discriminated union */
export type RequestAccountDeletionResponse =
  | RequestAccountDeletionSuccessResponse
  | RequestAccountDeletionErrorResponse

/** Response from cancel_account_deletion */
export interface CancelAccountDeletionResponse {
  success: boolean
  message: string
}

/** Response from get_deletion_status - Success case */
export interface GetDeletionStatusSuccessResponse {
  success: true
  deletion_requested_at: string | null
  scheduled_for: string | null
  is_pending: boolean
  deleted_at: string | null
  grace_days: number
  days_remaining: number | null
}

/** Response from get_deletion_status - Error case */
export interface GetDeletionStatusErrorResponse {
  success: false
  message: string
}

/** Response from get_deletion_status - Discriminated union */
export type GetDeletionStatusResponse =
  | GetDeletionStatusSuccessResponse
  | GetDeletionStatusErrorResponse

/** Response from gdpr_delete_user */
export interface GdprDeleteUserResponse {
  success: boolean
  message: string
  details?: {
    user_id: string
    deletion_type: string
    records_affected: string
  }
}

/** Response from gdpr_delete_user_and_stores */
export interface GdprDeleteUserAndStoresResponse {
  success: boolean
  message: string
  details?: {
    user_id: string
    deletion_type: string
    records_affected: string
  }
}

/** Response from process_expired_deletions */
export interface ProcessExpiredDeletionsResponse {
  success: boolean
  processed: number
  failed: number
  run_at: string
}

// =============================================================================
// PUBLIC SCHEMA - CSV IMPORT
// =============================================================================

/** Single row for CSV import */
export interface CsvImportRow {
  SKU: string
  Product_Name: string
  Category?: string
  Quantity: number
  Expiry_Date: string
  Brand?: string
  Cost_Price?: number
  Selling_Price?: number
  Location?: string
  Unit_Type?: string
  Manufacture_Date?: string
}

/** Skipped duplicate info from fast_csv_import_skip_duplicates */
export interface SkippedDuplicate {
  sku: string
  product_name: string
  expiry_date: string
  reason: string
}

/** Response from fast_csv_import_skip_duplicates */
export interface FastCsvImportResponse {
  success: boolean
  processed: number
  skipped: number
  total_items: number
  errors: string[]
  duplicates_skipped: SkippedDuplicate[]
  duplicate_detection_ms: number
  database_operations_ms: number
  method: string
  error?: string
}

/** Response from bulk_csv_import */
export interface BulkCsvImportResult {
  processed_count: number
  error_messages: string[]
  product_ids_result: string[]
  batch_ids_result: string[]
}

/** Response from bulk_insert_csv_batches_with_store_link */
export interface BulkInsertCsvBatchesResult {
  inserted_count: number
  batch_ids: string[]
  processing_time_ms: number
  store_products_linked: number
  products_created: number
}

// =============================================================================
// PUBLIC SCHEMA - STORE ANALYTICS
// =============================================================================

/** Category waste breakdown */
export interface WasteByCategoryItem {
  count: number
  value: number
}

/** Response from get_store_waste_analytics */
export interface StoreWasteAnalyticsResult {
  expired_items: number
  expiring_soon: number
  waste_value: number
  prevention_potential: number
  waste_by_category: Record<string, WasteByCategoryItem>
}

/** Urgency distribution for dashboard */
export interface UrgencyDistribution {
  critical?: number
  high?: number
  medium?: number
  low?: number
  none?: number
}

/** Response row from get_todos_dashboard_overview */
export interface TodosDashboardOverviewRow {
  todo_state: string
  item_count: number
  total_value: number
  avg_score: number
  urgency_distribution: UrgencyDistribution
}

// =============================================================================
// PUBLIC SCHEMA - USER MANAGEMENT
// =============================================================================

/** Response from check_user_exists_by_email */
export interface CheckUserExistsResponse {
  exists: boolean
  user_id?: string
  email?: string
  full_name?: string
  username?: string
  created_at?: string
}

/** Response from invite_user_to_store */
export interface InviteUserToStoreResponse {
  success: boolean
  user_id?: string
  email?: string
  role?: StoreRole
  store_name?: string
  message: string
  error?: 'user_not_found' | 'already_member' | 'database_error'
  existing_role?: StoreRole
}

/** Response from update_user_metadata */
export interface UpdateUserMetadataResponse {
  success: boolean
  user_id: string
  updated_metadata: Record<string, unknown>
}

/** Response from update_user_email */
export interface UpdateUserEmailResponse {
  success: boolean
  user_id: string
  new_email: string
}

/** Response from update_user_phone */
export interface UpdateUserPhoneResponse {
  success: boolean
  user_id: string
  phone: string | null
}

/** Response from update_user_language_preference */
export interface UpdateUserLanguagePreferenceResponse {
  success: boolean
  user_id: string
  language_preference: 'en' | 'fr' | 'nl' | 'de' | 'es'
}

// =============================================================================
// BUSINESS SCHEMA - STORE MANAGEMENT
// =============================================================================

/** Response from deactivate_store_safe */
export interface DeactivateStoreResponse {
  success: boolean
  store_id: string
  store_name: string
  deactivated_at: string
  employees_anonymized: number
  message: string
}

/** User permissions JSONB structure */
export interface UserPermissions {
  can_scan_products?: boolean
  can_scan_in?: boolean
  can_scan_out?: boolean
  can_view_basic_inventory?: boolean
  can_apply_discounts?: boolean
  can_view_analytics?: boolean
  can_upload_inventory?: boolean
  can_manage_users?: boolean
  can_manage_settings?: boolean
}

/** PIN permissions JSONB structure */
export interface PinPermissions {
  can_scan?: boolean
  can_checkout?: boolean
  can_view_inventory?: boolean
}

/** Store user row from get_store_users / update_store_user_safe */
export interface StoreUserRow {
  store_id: string
  user_id: string
  role_in_store: StoreRole
  permissions: UserPermissions | null
  assigned_at: string
  assigned_by: string | null
  is_active: boolean
  can_use_pin_auth: boolean
  pin_access_level: string | null
  pin_permissions: PinPermissions | null
  email: string
  created_at: string
  updated_at: string
  raw_user_meta_data: Record<string, unknown> | null
}

/** Extended store user row with total count (paginated) */
export interface StoreUserRowPaginated extends StoreUserRow {
  total_count: number
}

/** Response from remove_user_from_store */
export interface RemoveUserFromStoreResult {
  success: boolean
  error?: string
  removed_user_role?: string
  removed_by?: string
}

/** Response from add_employee (invite_user_to_store) */
export interface AddEmployeeResult {
  success: boolean
  error?: string
  existing_role?: string
  user_id?: string
}

// =============================================================================
// BUSINESS SCHEMA - STORE SETTINGS
// =============================================================================

/** Scoring weights configuration */
export interface ScoringWeights {
  expiry: number
  margin: number
  velocity: number
}

/** Opening hours for a single day */
export interface DayHours {
  open: string
  close: string
}

/** Opening hours configuration */
export interface OpeningHours {
  monday?: DayHours
  tuesday?: DayHours
  wednesday?: DayHours
  thursday?: DayHours
  friday?: DayHours
  saturday?: DayHours
  sunday?: DayHours
}

/** Peak hours configuration */
export interface PeakHours {
  morning?: string
  evening?: string
  [key: string]: string | undefined
}

/** Notification preferences */
export interface NotificationPreferences {
  sms_alerts: boolean
  email_alerts: boolean
  push_notifications: boolean
  alert_types: string[]
}

/** Display preferences */
export interface DisplayPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  date_format: string
  time_format: '12h' | '24h'
}

/** Backup preferences */
export interface BackupPreferences {
  auto_backup: boolean
  retention_days: number
  backup_frequency: 'daily' | 'weekly' | 'monthly'
}

/** Response row from update_store_advanced_settings */
export interface StoreAdvancedSettingsRow {
  store_id: string
  critical_threshold: number
  warning_threshold: number
  scoring_weights: ScoringWeights
  currency: string
  opening_hours: OpeningHours
  peak_hours: PeakHours
  weather_location_lat: number | null
  weather_location_lon: number | null
  notification_preferences: NotificationPreferences
  display_preferences: DisplayPreferences
  backup_preferences: BackupPreferences
  updated_at: string
}

/** Complete store settings result (legacy) */
export interface StoreSettingsCompleteResult {
  store: {
    store_id: string
    store_name: string
    business_name?: string
    store_code: string
    store_type?: 'supermarket' | 'convenience' | 'restaurant' | 'bakery' | 'butcher' | 'organic'
    size_category?: 'small' | 'medium' | 'large' | 'hypermarket'
    address?: string
    city?: string
    postal_code?: string
    country?: string
    timezone?: string
    phone?: string
    email?: string
    website_url?: string
    description?: string
    latitude?: number
    longitude?: number
    logo_url?: string
    cover_image_url?: string
    default_markup_percent?: number
    waste_reduction_target_percent?: number
    owner_id?: string
    is_active: boolean
    onboarding_completed: boolean
    created_at: string
    updated_at: string
  }
  settings?: {
    store_id: string
    scoring_weights?: {
      expiry: number
      margin: number
      velocity: number
    }
    critical_threshold?: number
    warning_threshold?: number
    opening_hours?: Record<string, { open: string; close: string }>
    peak_hours?: Record<string, string>
    weather_location_lat?: number
    weather_location_lon?: number
    currency?: string
    notification_preferences?: {
      email_alerts: boolean
      sms_alerts: boolean
      push_notifications: boolean
      alert_types: string[]
    }
    backup_preferences?: {
      auto_backup: boolean
      backup_frequency: string
      retention_days: number
    }
    display_preferences?: {
      theme: string
      language: string
      date_format: string
      time_format: string
    }
    updated_at: string
  }
}

/** Update store settings result (legacy) */
export interface UpdateStoreSettingsResult {
  store_id: string
  store_name: string
  business_name?: string
  store_code: string
  store_type?: string
  size_category?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website_url?: string
  description?: string
  default_markup_percent?: number
  waste_reduction_target_percent?: number
  is_active: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

/** Update store advanced settings result (legacy) */
export interface UpdateStoreAdvancedSettingsResult {
  store_id: string
  critical_threshold?: number
  warning_threshold?: number
  scoring_weights?: {
    expiry: number
    margin: number
    velocity: number
  }
  notification_preferences?: {
    email_alerts: boolean
    sms_alerts: boolean
    push_notifications: boolean
    alert_types: string[]
  }
  display_preferences?: {
    theme: string
    language: string
    date_format: string
    time_format: string
  }
  backup_preferences?: {
    auto_backup: boolean
    backup_frequency: string
    retention_days: number
  }
  opening_hours?: Record<string, { open: string; close: string }>
  peak_hours?: Record<string, string>
  weather_location_lat?: number
  weather_location_lon?: number
  currency?: string
  updated_at: string
}

/** Update store thresholds result (legacy) */
export interface UpdateStoreThresholdsResult {
  store_id: string
  critical_threshold: number
  warning_threshold: number
  updated_at: string
}

/** Get store settings result (legacy) */
export interface GetStoreSettingsResult {
  store_id: string
  store_name: string
  business_name?: string
  store_code: string
  store_type?: string
  size_category?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website_url?: string
  description?: string
  default_markup_percent?: number
  waste_reduction_target_percent?: number
  owner_id?: string
  is_active: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// SCORING SCHEMA
// =============================================================================

/** Recommended action from AI scoring */
export type RecommendedAction =
  | 'donate_or_dispose'
  | 'immediate_discount'
  | 'apply_discount'
  | 'monitor'

/** Response from calculate_batch_score */
export interface CalculateBatchScoreResponse {
  score: number
  urgency_level: UrgencyLevel
  days_until_expiration: number
  recommended_action: RecommendedAction
}

// =============================================================================
// USER_MGMT SCHEMA
// =============================================================================

/** User preferences from get_current_user_preferences */
export interface UserPreferencesRow {
  user_id: string
  primary_store_id: string | null
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

// =============================================================================
// PRODUCTS & BATCHES (TABLE ROWS)
// =============================================================================

/** Product row from get_products_paginated */
export interface ProductRow {
  product_id: string
  sku: string
  name: string
  description: string | null
  brand: string | null
  unit_type: string
  typical_shelf_life_days: number | null
  base_cost_price: number | null
  base_selling_price: number | null
  total_stock: number
  active_batches_count: number
  avg_days_to_expiry: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  barcode: string | null
  image_url: string | null
  open_food_facts_data: Record<string, unknown> | null
  last_verified: string | null
  barcode_type: string | null
  is_verified: boolean
  verification_count: number
  last_scanned_at: string | null
  category_id: string | null
  store_cost_price: number | null
  store_selling_price: number | null
  store_is_active: boolean
  store_sku: string | null
  supplier_code: string | null
  category_code: string | null
  category_display_name: string | null
  category_display_name_fr: string | null
  calculated_total_stock: number
  calculated_active_batches_count: number
  total_count: number
}

/** Batch row from get_batches_page */
export interface BatchRow {
  batch_id: string
  batch_number: string
  product_id: string
  product_name: string
  product_brand: string | null
  sku: string | null
  barcode: string | null
  expiry_date: string | null
  current_quantity: number
  available_quantity: number
  cost_price: number | null
  selling_price: number | null
  status: string
  verification_status: string | null
  location_code: string | null
  batch_source: string | null
  created_at: string
  updated_at: string
  total_count: number
}

/** Filter options for get_batches_page */
export interface BatchesPageFilters {
  status?: BatchStatus
}

/** Batch RPC result (legacy) */
export interface BatchRPCResult {
  batch_id: string
  batch_number: string
  product_id: string
  store_id: string
  expiry_date: string
  current_quantity: number
  available_quantity: number | null
  initial_quantity: number
  cost_price: number
  selling_price: number
  location_code: string | null
  status: string
  verification_status: string | null
  lifecycle_status: string
  barcode: string
  created_at?: string
  product_name?: string
  brand_name?: string
  category_name?: string
}

/** Available batches result (legacy) */
export interface AvailableBatchesResult {
  batch_id: string
  batch_number: string
  brand_name: string
  category_name: string
  product_name: string
  barcode: string
  expiry_date: string
  current_quantity: number
  available_quantity: number
  cost_price: number
  selling_price: number
  store_id: string
  created_at: string
}

// =============================================================================
// ANALYTICS SCHEMA
// =============================================================================

/** Urgent alerts result */
export interface UrgentAlertsResult {
  alert_type: string
  batch_id: string
  product_name: string
  brand_name: string
  category_name: string
  expiry_date: string
  current_quantity: number
  cost_price: number
  selling_price: number
  urgency_score: number
  days_to_expiry: number
  potential_loss: number
}

// =============================================================================
// PERMISSIONS SCHEMA
// =============================================================================

/** User can manage store users result */
export interface UserCanManageStoreUsersResult {
  can_manage: boolean
}

// =============================================================================
// LOOKUP & CACHE
// =============================================================================

/** Response from lookup_product_with_cache */
export interface LookupProductResult {
  found: boolean
  source: 'cache' | 'supabase' | 'none' | 'error'
  product_data: Record<string, unknown> | null
  cached_at: string | null
}

// =============================================================================
// EXPIRED BATCH STATUS UPDATE (CRON JOB)
// =============================================================================

/** Response from update_expired_batch_statuses */
export interface UpdateExpiredBatchStatusesResult {
  total_updated: number
  sold_out_count: number
  expired_count: number
  details: {
    timestamp: string
    sold_out_count: number
    expired_count: number
    lifecycle_expired_count: number
    total_updated: number
  }
}

// =============================================================================
// HELPER TYPE FOR RPC CALLS
// =============================================================================

/**
 * Helper type for Supabase RPC calls
 * Usage: const { data } = await supabase.rpc('function_name', params) as { data: RpcResult<'function_name'> }
 */
export type RpcResult<T extends keyof RpcResultMap> = RpcResultMap[T]

export interface RpcResultMap {
  // Inventory - Batch Updates
  batch_update_quantities: BatchUpdateQuantitiesResponse
  record_batch_actions: RecordBatchActionsResponse
  validate_batch_actions: ValidateBatchActionsResult[]
  update_batch: UpdateBatchResponse

  // Action Execution
  execute_discount_action: ExecuteDiscountResponse
  execute_donate_action: ExecuteDonateResponse
  execute_dispose_action: ExecuteDisposeResponse
  execute_sold_action: ExecuteSoldResponse
  execute_dismiss_action: ExecuteDismissResponse
  execute_bulk_action: ExecuteBulkActionResponse

  // Todos
  get_todos_counts_with_filters: TodoCounts
  get_todos_with_counts: TodoItemWithCounts[]
  get_todos_with_filters: TodoItem[]
  get_batch_todo_by_id: GetBatchTodoByIdResponse
  get_todos_dashboard_overview: TodosDashboardOverviewRow[]

  // Batch Tracking Setup
  get_batch_tracking_setup: BatchTrackingSetupResponse
  save_batch_tracking_setup: SaveBatchTrackingSetupResponse
  get_categories_with_tracking_settings: CategoryWithTrackingSettings[]
  get_products_for_tracking_setup: ProductWithTrackingSettings[]

  // CSV Import
  fast_csv_import_skip_duplicates: FastCsvImportResponse
  bulk_csv_import: BulkCsvImportResult
  bulk_insert_csv_batches_with_store_link: BulkInsertCsvBatchesResult

  // Analytics
  get_store_waste_analytics: StoreWasteAnalyticsResult

  // User Management
  check_user_exists_by_email: CheckUserExistsResponse
  invite_user_to_store: InviteUserToStoreResponse
  update_user_metadata: UpdateUserMetadataResponse
  update_user_email: UpdateUserEmailResponse
  update_user_phone: UpdateUserPhoneResponse
  update_user_language_preference: UpdateUserLanguagePreferenceResponse
  get_store_users: StoreUserRow[]
  get_store_users_paginated: StoreUserRowPaginated[]
  update_store_user_safe: StoreUserRow[]
  get_users_with_metadata: Array<{
    id: string
    email: string
    created_at: string
    updated_at: string
    raw_user_meta_data: Record<string, unknown> | null
    username: string
    full_name: string
    is_active: boolean
    avatar_url: string
    last_login: string
    email_verified: boolean
    phone_verified: boolean
    phone: string | null
    language_preference: string
  }>

  // Store Management
  deactivate_store_safe: DeactivateStoreResponse
  update_store_advanced_settings: StoreAdvancedSettingsRow[]
  get_user_stores_with_details: Array<{
    role_in_store: string
    permissions: UserPermissions | null
    assigned_at: string
    store_id: string
    store_name: string
    store_code: string | null
    business_name: string | null
    address: string | null
    city: string | null
    postal_code: string | null
    country: string | null
    timezone: string | null
    store_type: string | null
    size_category: string | null
    default_markup_percent: number | null
    waste_reduction_target_percent: number | null
    owner_id: string | null
    is_active: boolean
    onboarding_completed: boolean
    created_at: string
    updated_at: string
  }>
  get_user_store_role: Array<{
    user_id: string
    role_in_store: StoreRole
    permissions: UserPermissions | null
    is_active: boolean
    can_use_pin_auth: boolean
    pin_access_level: string | null
    store_id: string
    store_name: string
  }>

  // Products & Batches
  get_products_paginated: ProductRow[]
  get_batches_page: BatchRow[]
  lookup_product_with_cache: LookupProductResult[]

  // Scoring
  calculate_batch_score: CalculateBatchScoreResponse

  // User Preferences
  get_current_user_preferences: UserPreferencesRow[]
  get_user_preferences_fast: UserPreferencesRow[]

  // Maintenance
  update_expired_batch_statuses: UpdateExpiredBatchStatusesResult[]

  // GDPR & Account Deletion
  request_account_deletion: RequestAccountDeletionResponse
  cancel_account_deletion: CancelAccountDeletionResponse
  get_deletion_status: GetDeletionStatusResponse
  gdpr_delete_user: GdprDeleteUserResponse
  gdpr_delete_user_and_stores: GdprDeleteUserAndStoresResponse
  process_expired_deletions: ProcessExpiredDeletionsResponse
}

// =============================================================================
// BACKWARD COMPATIBILITY ALIASES
// Keep these until all usages are migrated to new names
// =============================================================================

/** @deprecated Use individual action response types instead */
export type BatchActionResult =
  | ExecuteDiscountResponse
  | ExecuteDonateResponse
  | ExecuteDisposeResponse
  | ExecuteSoldResponse
  | ExecuteDismissResponse

/** @deprecated Use ExecuteBulkActionResponse instead */
export type BulkBatchActionResult = ExecuteBulkActionResponse

/** @deprecated Use CheckUserExistsResponse instead */
export type CheckUserExistsResult = CheckUserExistsResponse
