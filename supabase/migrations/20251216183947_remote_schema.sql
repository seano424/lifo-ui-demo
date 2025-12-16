drop trigger if exists "trigger_batches_updated_at" on "inventory"."batches";

drop trigger if exists "trigger_categories_updated_at" on "inventory"."categories";

drop trigger if exists "trigger_update_cache_updated_at" on "inventory"."product_recognition_cache";

drop trigger if exists "trigger_products_updated_at" on "inventory"."products";

drop policy "Store owners and managers can insert store settings" on "business"."store_settings";

drop policy "Store owners and managers can update store settings" on "business"."store_settings";

drop policy "Store owners and managers can view store settings" on "business"."store_settings";

drop policy "Users can manage settings for their stores" on "business"."store_settings";

drop policy "batch_action_entries_delete_policy" on "inventory"."batch_actions";

drop policy "Users can view batch status logs" on "inventory"."batch_status_logs";

drop policy "batches_delete_policy" on "inventory"."batches";

drop policy "batches_update_policy" on "inventory"."batches";

drop policy "Store managers can remove products from stores" on "inventory"."store_products";

drop policy "Only privileged users can delete transactions" on "sales"."transactions";

drop policy "Authorized users can insert sales events" on "timeseries"."sales_events";

drop policy "Store managers can assign roles" on "user_mgmt"."user_roles";

drop policy "Store managers can update user roles" on "user_mgmt"."user_roles";

drop policy "Store managers can create employee accounts" on "user_mgmt"."users";

drop policy "Store managers can update employee profiles" on "user_mgmt"."users";

drop policy "Store managers can view employee profiles" on "user_mgmt"."users";

alter table "business"."store_users" drop constraint "chk_pin_access_level";

alter table "business"."store_users" drop constraint "store_users_role_in_store_check";

alter table "business"."stores" drop constraint "stores_size_category_check";

alter table "inventory"."batch_actions" drop constraint "batch_action_entries_quantity_affected_check";

alter table "inventory"."batch_actions" drop constraint "batch_actions_valid_action";

alter table "inventory"."batch_actions" drop constraint "valid_action_specific_fields";

alter table "inventory"."batches" drop constraint "batches_status_check";

alter table "inventory"."batches" drop constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" drop constraint "ocr_processing_batches_processing_status_check";

alter table "scoring"."product_scores" drop constraint "product_scores_status_check";

drop view if exists "inventory"."automation_preview";

drop view if exists "inventory"."batch_expiry_status";

drop view if exists "inventory"."batch_todo_states";

drop function if exists "inventory"."get_action_statistics"(p_store_id uuid, p_start_date date, p_end_date date);

drop function if exists "inventory"."get_batch_action_breakdown"(p_batch_id uuid);

drop function if exists "inventory"."get_donation_recipients"(p_store_id uuid);

drop function if exists "inventory"."get_recent_actions"(p_store_id uuid, p_limit integer);

drop function if exists "public"."get_todos_dashboard"(p_store_id uuid);

drop function if exists "public"."get_todos_with_filters"(p_store_id uuid, p_filters jsonb, p_limit integer, p_offset integer);

drop view if exists "public"."inventory_view_for_scoring";

drop function if exists "public"."update_expired_batch_statuses"();

drop view if exists "scoring"."recommendation_accuracy";

drop index if exists "scoring"."idx_product_scores_recommendations";


  create table "public"."batch_actions" (
    "entry_id" character varying(36) not null,
    "batch_id" character varying(36) not null,
    "store_id" character varying(36) not null,
    "action_type" public.action_type not null,
    "recommended_action" public.action_type,
    "ai_score" numeric(3,2),
    "quantity_affected" numeric(12,4) not null,
    "total_original_value" numeric(10,2) not null,
    "total_recovered_value" numeric(10,2) not null,
    "batch_initial_quantity" numeric(12,4) not null,
    "discount_percentage" numeric(5,2),
    "disposal_reason" text,
    "notes" text,
    "performed_by" character varying(36),
    "performed_at" timestamp without time zone,
    "verified_by" character varying(36),
    "verified_at" timestamp without time zone,
    "donation_recipient_id" character varying(36),
    "created_at" timestamp without time zone not null
      );


alter table "public"."batch_actions" enable row level security;


  create table "public"."batches" (
    "batch_id" character varying(36) not null,
    "product_id" character varying(36) not null,
    "store_id" character varying(36) not null,
    "batch_number" character varying(100) not null,
    "supplier" character varying(255),
    "manufacture_date" date not null,
    "expiry_date" date not null,
    "received_date" date,
    "initial_quantity" numeric(12,4) not null,
    "current_quantity" numeric(12,4) not null,
    "reserved_quantity" numeric(12,4),
    "cost_price" numeric(12,4),
    "selling_price" numeric(12,4),
    "location_code" character varying(50),
    "status" character varying(20),
    "batch_source" character varying(50),
    "scanned_barcode" character varying(50),
    "scan_confidence" numeric(3,2),
    "verification_status" character varying(20),
    "ocr_extracted_date" character varying(255),
    "ocr_confidence" numeric(3,2),
    "created_by" character varying(36),
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
      );


alter table "public"."batches" enable row level security;


  create table "public"."categories" (
    "category_id" character varying(36) not null,
    "category_code" character varying(100) not null,
    "display_name_en" character varying(255),
    "display_name_fr" character varying(255),
    "parent_category_id" character varying(36),
    "typical_shelf_life_days" integer,
    "is_active" boolean,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
      );


alter table "public"."categories" enable row level security;


  create table "public"."category_weights" (
    "category" character varying(100) not null,
    "spoilage_risk_weight" numeric(3,2) not null,
    "value_impact_weight" numeric(3,2) not null,
    "turnover_speed_weight" numeric(3,2) not null,
    "description" text,
    "is_active" boolean,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
      );


alter table "public"."category_weights" enable row level security;


  create table "public"."donation_recipients" (
    "recipient_id" character varying(36) not null,
    "name" character varying(255) not null,
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "recipient_type" public.donation_recipient_type not null,
    "is_certified" boolean,
    "certification_notes" text,
    "accepts_pickups" boolean,
    "max_distance_km" integer,
    "store_id" character varying(36) not null,
    "is_active" boolean,
    "created_at" timestamp without time zone,
    "created_by" character varying(36)
      );


alter table "public"."donation_recipients" enable row level security;


  create table "public"."external_factors" (
    "factor_id" character varying(36) not null,
    "store_id" character varying(36),
    "recorded_at" timestamp without time zone,
    "temperature" numeric(5,2),
    "humidity" numeric(5,2),
    "is_rainy" boolean,
    "is_holiday" boolean,
    "local_events" json,
    "day_of_week" integer,
    "hour_of_day" integer,
    "week_of_year" integer
      );


alter table "public"."external_factors" enable row level security;


  create table "public"."inventory_snapshots" (
    "snapshot_id" character varying(36) not null,
    "batch_id" character varying(36),
    "store_id" character varying(36),
    "sku" character varying(100),
    "quantity" numeric(12,4),
    "price" numeric(12,4),
    "days_to_expiry" integer,
    "snapshot_timestamp" timestamp without time zone,
    "day_of_week" integer,
    "hour_of_day" integer,
    "is_weekend" boolean,
    "temperature" numeric(5,2),
    "is_holiday" boolean
      );


alter table "public"."inventory_snapshots" enable row level security;


  create table "public"."product_scores" (
    "score_id" character varying(36) not null,
    "batch_id" character varying(36),
    "store_id" character varying(36),
    "expiry_score" numeric(3,2),
    "velocity_score" numeric(3,2),
    "margin_score" numeric(3,2),
    "composite_score" numeric(3,2),
    "recommendation" character varying(50),
    "urgency_level" character varying(20),
    "discount_percent" integer,
    "reason" text,
    "ml_enhanced" boolean,
    "confidence_level" numeric(3,2),
    "calculated_at" timestamp without time zone
      );


alter table "public"."product_scores" enable row level security;


  create table "public"."products" (
    "product_id" character varying(36) not null,
    "sku" character varying(100) not null,
    "name" character varying(255) not null,
    "description" text,
    "category_id" character varying(36),
    "brand" character varying(100),
    "unit_type" character varying(20),
    "barcode" character varying(50),
    "barcode_type" character varying(20),
    "typical_shelf_life_days" integer not null,
    "base_cost_price" numeric(12,4) not null,
    "base_selling_price" numeric(12,4) not null,
    "is_verified" boolean,
    "verification_count" integer,
    "last_scanned_at" timestamp without time zone,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "created_by" character varying(36)
      );


alter table "public"."products" enable row level security;


  create table "public"."roles" (
    "id" character varying(36) not null,
    "name" character varying(50) not null,
    "description" text,
    "permissions" json,
    "created_at" timestamp without time zone
      );


alter table "public"."roles" enable row level security;


  create table "public"."sales_events" (
    "event_id" character varying(36) not null,
    "batch_id" character varying(36),
    "store_id" character varying(36),
    "sku" character varying(100),
    "quantity_sold" numeric(12,4),
    "sale_price" numeric(12,4),
    "sale_timestamp" timestamp without time zone,
    "channel" character varying(50),
    "customer_type" character varying(50)
      );


alter table "public"."sales_events" enable row level security;


  create table "public"."store_products" (
    "store_id" character varying(36) not null,
    "product_id" character varying(36) not null,
    "cost_price" numeric(12,4),
    "selling_price" numeric(12,4),
    "is_active" boolean,
    "store_sku" character varying(100),
    "supplier_code" character varying(50),
    "added_by" character varying(36),
    "updated_by" character varying(36),
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
      );


alter table "public"."store_products" enable row level security;


  create table "public"."store_settings" (
    "store_id" character varying(36) not null,
    "scoring_weights" json,
    "donation_preference_config" json,
    "critical_threshold" numeric(3,2),
    "warning_threshold" numeric(3,2),
    "opening_hours" json,
    "peak_hours" json,
    "weather_location_lat" numeric(10,8),
    "weather_location_lon" numeric(11,8),
    "currency" character varying(3),
    "updated_at" timestamp without time zone
      );


alter table "public"."store_settings" enable row level security;


  create table "public"."store_users" (
    "store_id" character varying(36) not null,
    "user_id" character varying(36) not null,
    "role_in_store" character varying(50),
    "permissions" json,
    "assigned_at" timestamp without time zone,
    "assigned_by" character varying(36),
    "is_active" boolean
      );


alter table "public"."store_users" enable row level security;


  create table "public"."stores" (
    "store_id" character varying(36) not null,
    "store_name" character varying(255) not null,
    "store_code" character varying(50) not null,
    "business_name" character varying(255),
    "address" text,
    "city" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(100),
    "timezone" character varying(50),
    "store_type" character varying(50),
    "size_category" character varying(20),
    "default_markup_percent" numeric(5,2),
    "waste_reduction_target_percent" numeric(5,2),
    "owner_id" character varying(36),
    "is_active" boolean,
    "onboarding_completed" boolean,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
      );


alter table "public"."stores" enable row level security;


  create table "public"."user_roles" (
    "user_id" character varying(36) not null,
    "role_id" character varying(36) not null,
    "assigned_at" timestamp without time zone,
    "assigned_by" character varying(36)
      );


alter table "public"."user_roles" enable row level security;


  create table "public"."users" (
    "id" character varying(36) not null,
    "email" character varying(255) not null,
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp without time zone,
    "raw_user_meta_data" json,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
      );


alter table "public"."users" enable row level security;

alter table "analytics"."actions" alter column "action_id" set default extensions.uuid_generate_v4();

alter table "business"."stores" alter column "store_id" set default extensions.uuid_generate_v4();

alter table "inventory"."batch_actions" alter column "action_type" set data type public.action_type using "action_type"::text::public.action_type;

alter table "inventory"."batch_actions" alter column "recommended_action" set data type public.action_type using "recommended_action"::text::public.action_type;

alter table "inventory"."batch_status_logs" alter column "log_id" set default extensions.uuid_generate_v4();

alter table "inventory"."batches" add column "lifecycle_status" character varying(20) default 'active'::character varying;

alter table "inventory"."batches" alter column "batch_id" set default extensions.uuid_generate_v4();

alter table "inventory"."donation_recipients" alter column "recipient_type" set data type public.donation_recipient_type using "recipient_type"::text::public.donation_recipient_type;

alter table "inventory"."products" add column "active_batches_count" integer default 0;

alter table "inventory"."products" add column "avg_days_to_expiry" numeric(8,2);

alter table "inventory"."products" add column "total_stock" numeric(12,4) default 0;

alter table "inventory"."products" alter column "product_id" set default extensions.uuid_generate_v4();

alter table "scoring"."product_scores" alter column "score_id" set default extensions.uuid_generate_v4();

alter table "timeseries"."external_factors" alter column "factor_id" set default extensions.uuid_generate_v4();

alter table "timeseries"."inventory_snapshots" alter column "snapshot_id" set default extensions.uuid_generate_v4();

alter table "timeseries"."sales_events" alter column "event_id" set default extensions.uuid_generate_v4();

alter table "user_mgmt"."roles" alter column "role_id" set default extensions.uuid_generate_v4();

CREATE INDEX idx_batches_lifecycle_status ON inventory.batches USING btree (lifecycle_status);

CREATE UNIQUE INDEX batch_actions_pkey ON public.batch_actions USING btree (entry_id);

CREATE UNIQUE INDEX batches_pkey ON public.batches USING btree (batch_id);

CREATE UNIQUE INDEX categories_category_code_key ON public.categories USING btree (category_code);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (category_id);

CREATE UNIQUE INDEX category_weights_pkey ON public.category_weights USING btree (category);

CREATE UNIQUE INDEX donation_recipients_pkey ON public.donation_recipients USING btree (recipient_id);

CREATE UNIQUE INDEX external_factors_pkey ON public.external_factors USING btree (factor_id);

CREATE UNIQUE INDEX inventory_snapshots_pkey ON public.inventory_snapshots USING btree (snapshot_id);

CREATE UNIQUE INDEX product_scores_pkey ON public.product_scores USING btree (score_id);

CREATE UNIQUE INDEX products_barcode_key ON public.products USING btree (barcode);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (product_id);

CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX sales_events_pkey ON public.sales_events USING btree (event_id);

CREATE UNIQUE INDEX store_products_pkey ON public.store_products USING btree (store_id, product_id);

CREATE UNIQUE INDEX store_settings_pkey ON public.store_settings USING btree (store_id);

CREATE UNIQUE INDEX store_users_pkey ON public.store_users USING btree (store_id, user_id);

CREATE UNIQUE INDEX stores_pkey ON public.stores USING btree (store_id);

CREATE UNIQUE INDEX stores_store_code_key ON public.stores USING btree (store_code);

CREATE UNIQUE INDEX uq_batch_score ON public.product_scores USING btree (batch_id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id, role_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE INDEX idx_product_scores_recommendations ON scoring.product_scores USING btree (store_id, recommendation, calculated_at DESC) INCLUDE (batch_id, composite_score, urgency_level, discount_percent) WHERE ((recommendation)::text = ANY ((ARRAY['discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying])::text[]));

alter table "public"."batch_actions" add constraint "batch_actions_pkey" PRIMARY KEY using index "batch_actions_pkey";

alter table "public"."batches" add constraint "batches_pkey" PRIMARY KEY using index "batches_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."category_weights" add constraint "category_weights_pkey" PRIMARY KEY using index "category_weights_pkey";

alter table "public"."donation_recipients" add constraint "donation_recipients_pkey" PRIMARY KEY using index "donation_recipients_pkey";

alter table "public"."external_factors" add constraint "external_factors_pkey" PRIMARY KEY using index "external_factors_pkey";

alter table "public"."inventory_snapshots" add constraint "inventory_snapshots_pkey" PRIMARY KEY using index "inventory_snapshots_pkey";

alter table "public"."product_scores" add constraint "product_scores_pkey" PRIMARY KEY using index "product_scores_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."sales_events" add constraint "sales_events_pkey" PRIMARY KEY using index "sales_events_pkey";

alter table "public"."store_products" add constraint "store_products_pkey" PRIMARY KEY using index "store_products_pkey";

alter table "public"."store_settings" add constraint "store_settings_pkey" PRIMARY KEY using index "store_settings_pkey";

alter table "public"."store_users" add constraint "store_users_pkey" PRIMARY KEY using index "store_users_pkey";

alter table "public"."stores" add constraint "stores_pkey" PRIMARY KEY using index "stores_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."batch_actions" add constraint "batch_actions_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) ON DELETE CASCADE not valid;

alter table "public"."batch_actions" validate constraint "batch_actions_batch_id_fkey";

alter table "public"."batch_actions" add constraint "batch_actions_donation_recipient_id_fkey" FOREIGN KEY (donation_recipient_id) REFERENCES public.donation_recipients(recipient_id) not valid;

alter table "public"."batch_actions" validate constraint "batch_actions_donation_recipient_id_fkey";

alter table "public"."batch_actions" add constraint "batch_actions_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES public.users(id) not valid;

alter table "public"."batch_actions" validate constraint "batch_actions_performed_by_fkey";

alter table "public"."batch_actions" add constraint "batch_actions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."batch_actions" validate constraint "batch_actions_store_id_fkey";

alter table "public"."batch_actions" add constraint "batch_actions_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public.users(id) not valid;

alter table "public"."batch_actions" validate constraint "batch_actions_verified_by_fkey";

alter table "public"."batches" add constraint "batches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."batches" validate constraint "batches_created_by_fkey";

alter table "public"."batches" add constraint "batches_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(product_id) not valid;

alter table "public"."batches" validate constraint "batches_product_id_fkey";

alter table "public"."batches" add constraint "batches_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."batches" validate constraint "batches_store_id_fkey";

alter table "public"."categories" add constraint "categories_category_code_key" UNIQUE using index "categories_category_code_key";

alter table "public"."categories" add constraint "categories_parent_category_id_fkey" FOREIGN KEY (parent_category_id) REFERENCES public.categories(category_id) not valid;

alter table "public"."categories" validate constraint "categories_parent_category_id_fkey";

alter table "public"."category_weights" add constraint "chk_spoilage_weight" CHECK (((spoilage_risk_weight >= (0)::numeric) AND (spoilage_risk_weight <= (1)::numeric))) not valid;

alter table "public"."category_weights" validate constraint "chk_spoilage_weight";

alter table "public"."category_weights" add constraint "chk_turnover_weight" CHECK (((turnover_speed_weight >= (0)::numeric) AND (turnover_speed_weight <= (1)::numeric))) not valid;

alter table "public"."category_weights" validate constraint "chk_turnover_weight";

alter table "public"."category_weights" add constraint "chk_value_weight" CHECK (((value_impact_weight >= (0)::numeric) AND (value_impact_weight <= (1)::numeric))) not valid;

alter table "public"."category_weights" validate constraint "chk_value_weight";

alter table "public"."category_weights" add constraint "chk_weights_sum" CHECK ((((spoilage_risk_weight + value_impact_weight) + turnover_speed_weight) = 1.0)) not valid;

alter table "public"."category_weights" validate constraint "chk_weights_sum";

alter table "public"."donation_recipients" add constraint "donation_recipients_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."donation_recipients" validate constraint "donation_recipients_created_by_fkey";

alter table "public"."donation_recipients" add constraint "donation_recipients_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."donation_recipients" validate constraint "donation_recipients_store_id_fkey";

alter table "public"."external_factors" add constraint "external_factors_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."external_factors" validate constraint "external_factors_store_id_fkey";

alter table "public"."inventory_snapshots" add constraint "inventory_snapshots_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) not valid;

alter table "public"."inventory_snapshots" validate constraint "inventory_snapshots_batch_id_fkey";

alter table "public"."inventory_snapshots" add constraint "inventory_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."inventory_snapshots" validate constraint "inventory_snapshots_store_id_fkey";

alter table "public"."product_scores" add constraint "chk_composite_score" CHECK (((composite_score >= (0)::numeric) AND (composite_score <= (1)::numeric))) not valid;

alter table "public"."product_scores" validate constraint "chk_composite_score";

alter table "public"."product_scores" add constraint "chk_confidence_level" CHECK (((confidence_level >= (0)::numeric) AND (confidence_level <= (1)::numeric))) not valid;

alter table "public"."product_scores" validate constraint "chk_confidence_level";

alter table "public"."product_scores" add constraint "chk_expiry_score" CHECK (((expiry_score >= (0)::numeric) AND (expiry_score <= (1)::numeric))) not valid;

alter table "public"."product_scores" validate constraint "chk_expiry_score";

alter table "public"."product_scores" add constraint "chk_margin_score" CHECK (((margin_score >= (0)::numeric) AND (margin_score <= (1)::numeric))) not valid;

alter table "public"."product_scores" validate constraint "chk_margin_score";

alter table "public"."product_scores" add constraint "chk_recommendation" CHECK (((recommendation)::text = ANY ((ARRAY['dispose'::character varying, 'discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying, 'monitor'::character varying, 'maintain'::character varying])::text[]))) not valid;

alter table "public"."product_scores" validate constraint "chk_recommendation";

alter table "public"."product_scores" add constraint "chk_velocity_score" CHECK (((velocity_score >= (0)::numeric) AND (velocity_score <= (1)::numeric))) not valid;

alter table "public"."product_scores" validate constraint "chk_velocity_score";

alter table "public"."product_scores" add constraint "product_scores_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) not valid;

alter table "public"."product_scores" validate constraint "product_scores_batch_id_fkey";

alter table "public"."product_scores" add constraint "product_scores_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."product_scores" validate constraint "product_scores_store_id_fkey";

alter table "public"."product_scores" add constraint "uq_batch_score" UNIQUE using index "uq_batch_score";

alter table "public"."products" add constraint "products_barcode_key" UNIQUE using index "products_barcode_key";

alter table "public"."products" add constraint "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(category_id) not valid;

alter table "public"."products" validate constraint "products_category_id_fkey";

alter table "public"."products" add constraint "products_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."products" validate constraint "products_created_by_fkey";

alter table "public"."products" add constraint "products_sku_key" UNIQUE using index "products_sku_key";

alter table "public"."roles" add constraint "roles_name_key" UNIQUE using index "roles_name_key";

alter table "public"."sales_events" add constraint "sales_events_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id) not valid;

alter table "public"."sales_events" validate constraint "sales_events_batch_id_fkey";

alter table "public"."sales_events" add constraint "sales_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."sales_events" validate constraint "sales_events_store_id_fkey";

alter table "public"."store_products" add constraint "store_products_added_by_fkey" FOREIGN KEY (added_by) REFERENCES public.users(id) not valid;

alter table "public"."store_products" validate constraint "store_products_added_by_fkey";

alter table "public"."store_products" add constraint "store_products_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(product_id) not valid;

alter table "public"."store_products" validate constraint "store_products_product_id_fkey";

alter table "public"."store_products" add constraint "store_products_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."store_products" validate constraint "store_products_store_id_fkey";

alter table "public"."store_products" add constraint "store_products_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) not valid;

alter table "public"."store_products" validate constraint "store_products_updated_by_fkey";

alter table "public"."store_settings" add constraint "store_settings_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."store_settings" validate constraint "store_settings_store_id_fkey";

alter table "public"."store_users" add constraint "store_users_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(store_id) not valid;

alter table "public"."store_users" validate constraint "store_users_store_id_fkey";

alter table "public"."stores" add constraint "stores_store_code_key" UNIQUE using index "stores_store_code_key";

alter table "public"."user_roles" add constraint "user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) not valid;

alter table "public"."user_roles" validate constraint "user_roles_role_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "business"."store_users" add constraint "chk_pin_access_level" CHECK (((pin_access_level)::text = ANY ((ARRAY['basic'::character varying, 'elevated'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "chk_pin_access_level";

alter table "business"."store_users" add constraint "store_users_role_in_store_check" CHECK (((role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'employee'::character varying, 'staff'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "store_users_role_in_store_check";

alter table "business"."stores" add constraint "stores_size_category_check" CHECK (((size_category)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'hypermarket'::character varying])::text[]))) not valid;

alter table "business"."stores" validate constraint "stores_size_category_check";

alter table "inventory"."batch_actions" add constraint "batch_action_entries_quantity_affected_check" CHECK (((quantity_affected > (0)::numeric) OR ((quantity_affected = (0)::numeric) AND (action_type = 'ignored'::public.action_type)))) not valid;

alter table "inventory"."batch_actions" validate constraint "batch_action_entries_quantity_affected_check";

alter table "inventory"."batch_actions" add constraint "batch_actions_valid_action" CHECK ((((action_type IS NOT NULL) AND (action_type <> 'ignored'::public.action_type) AND (performed_by IS NOT NULL) AND (quantity_affected IS NOT NULL) AND (quantity_affected > (0)::numeric)) OR ((action_type = 'ignored'::public.action_type) AND (quantity_affected IS NOT NULL)))) not valid;

alter table "inventory"."batch_actions" validate constraint "batch_actions_valid_action";

alter table "inventory"."batch_actions" add constraint "valid_action_specific_fields" CHECK ((((action_type = 'discount'::public.action_type) AND (discount_percentage IS NOT NULL)) OR (action_type = 'donate'::public.action_type) OR ((action_type = 'dispose'::public.action_type) AND (disposal_reason IS NOT NULL)) OR (action_type = ANY (ARRAY['maintain'::public.action_type, 'ignored'::public.action_type, 'donate_prepared'::public.action_type, 'sold'::public.action_type])))) not valid;

alter table "inventory"."batch_actions" validate constraint "valid_action_specific_fields";

alter table "inventory"."batches" add constraint "batches_status_check" CHECK (((status)::text = ANY (ARRAY['draft'::text, 'active'::text, 'expired'::text, 'damaged'::text, 'sold_out'::text, 'reserved'::text, 'donated'::text, 'disposed'::text]))) not valid;

alter table "inventory"."batches" validate constraint "batches_status_check";

alter table "inventory"."batches" add constraint "batches_verification_check" CHECK (((verification_status)::text = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "inventory"."batches" validate constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" add constraint "ocr_processing_batches_processing_status_check" CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "inventory"."ocr_processing_batches" validate constraint "ocr_processing_batches_processing_status_check";

alter table "scoring"."product_scores" add constraint "product_scores_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'dismissed'::text]))) not valid;

alter table "scoring"."product_scores" validate constraint "product_scores_status_check";

set check_function_bodies = off;

create or replace view "inventory"."expiring_products" as  SELECT p.product_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.unit_type,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.total_stock,
    p.active_batches_count,
    p.avg_days_to_expiry,
    p.created_by,
    p.created_at,
    p.updated_at,
    p.barcode,
    p.image_url,
    p.open_food_facts_data,
    p.last_verified,
    p.barcode_type,
    p.is_verified,
    p.verification_count,
    p.last_scanned_at,
    p.category_id,
    c.category_code,
    c.display_name_en AS category_name,
    b.expiry_date,
    b.current_quantity,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry
   FROM ((inventory.products p
     JOIN inventory.categories c ON ((p.category_id = c.category_id)))
     JOIN inventory.batches b ON ((p.product_id = b.product_id)))
  WHERE ((b.expiry_date <= (CURRENT_DATE + '7 days'::interval)) AND ((b.status)::text = 'active'::text) AND (b.current_quantity > (0)::numeric));


create or replace view "inventory"."my_store_products" as  SELECT p.product_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.unit_type,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.total_stock,
    p.active_batches_count,
    p.avg_days_to_expiry,
    p.created_by,
    p.created_at,
    p.updated_at,
    p.barcode,
    p.image_url,
    p.open_food_facts_data,
    p.last_verified,
    p.barcode_type,
    p.is_verified,
    p.verification_count,
    p.last_scanned_at,
    p.category_id,
    sp.cost_price AS store_cost_price,
    sp.selling_price AS store_selling_price,
    sp.is_active AS store_is_active,
    sp.store_sku,
    sp.supplier_code,
    c.category_code,
    c.display_name_en AS category_name
   FROM ((inventory.products p
     JOIN inventory.store_products sp ON ((p.product_id = sp.product_id)))
     JOIN inventory.categories c ON ((p.category_id = c.category_id)))
  WHERE (sp.store_id IN ( SELECT su.store_id
           FROM business.store_users su
          WHERE (su.user_id = auth.uid())));


create or replace view "inventory"."products_needing_barcodes" as  SELECT p.product_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.unit_type,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.total_stock,
    p.active_batches_count,
    p.avg_days_to_expiry,
    p.created_by,
    p.created_at,
    p.updated_at,
    p.barcode,
    p.image_url,
    p.open_food_facts_data,
    p.last_verified,
    p.barcode_type,
    p.is_verified,
    p.verification_count,
    p.last_scanned_at,
    p.category_id,
    c.category_code,
    c.display_name_en AS category_name
   FROM (inventory.products p
     JOIN inventory.categories c ON ((p.category_id = c.category_id)))
  WHERE ((p.barcode IS NULL) OR (p.barcode = ''::text) OR (p.is_verified = false));


create or replace view "inventory"."products_with_categories" as  SELECT p.product_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.unit_type,
    p.typical_shelf_life_days,
    p.base_cost_price,
    p.base_selling_price,
    p.total_stock,
    p.active_batches_count,
    p.avg_days_to_expiry,
    p.created_by,
    p.created_at,
    p.updated_at,
    p.barcode,
    p.image_url,
    p.open_food_facts_data,
    p.last_verified,
    p.barcode_type,
    p.is_verified,
    p.verification_count,
    p.last_scanned_at,
    p.category_id,
    c.category_code,
    c.display_name_en AS category_display_name_en,
    c.display_name_fr AS category_display_name_fr,
    c.typical_shelf_life_days AS category_shelf_life,
    COALESCE(p.typical_shelf_life_days, c.typical_shelf_life_days) AS effective_shelf_life
   FROM (inventory.products p
     JOIN inventory.categories c ON ((p.category_id = c.category_id)));


CREATE OR REPLACE FUNCTION public.get_todos_with_counts(p_store_id uuid, p_filters jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(batch_id uuid, store_id uuid, batch_number character varying, expiry_date date, current_quantity numeric, available_quantity numeric, lifecycle_status character varying, batch_status character varying, product_name character varying, product_brand character varying, ai_recommendation character varying, composite_score numeric, urgency_level text, ai_calculated_at timestamp without time zone, last_action_type public.action_type, last_action_time timestamp without time zone, last_action_quantity numeric, last_discount_percent numeric, total_actions_ever bigint, total_discounted_quantity numeric, total_donated_quantity numeric, total_disposed_quantity numeric, total_sold_quantity numeric, total_ignored_quantity numeric, cost_price numeric, selling_price numeric, current_selling_price numeric, profit_margin numeric, profit_margin_percent numeric, potential_loss_value numeric, potential_revenue_value numeric, current_total_value numeric, unit_price numeric, completion_status text, todo_state text, priority_order integer, days_to_expiry integer, hours_since_last_action numeric, view_refreshed_at timestamp with time zone, total_count bigint, pending_count bigint, in_progress_count bigint, completed_count bigint, expiring_count bigint, expired_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_completion_status text;
    v_urgency_levels text[];
    v_action_types text[];
    v_batch_statuses text[];
    v_lifecycle_statuses text[];
    v_product_name text;
    v_days_to_expiry_max integer;
    v_days_to_expiry_min integer;
BEGIN
    -- Extract filter parameters from JSONB
    v_completion_status := p_filters->>'completion_status';
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::integer;
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::integer;
    
    -- Extract arrays with proper null/empty handling
    IF p_filters ? 'urgency_level' 
       AND p_filters->'urgency_level' IS NOT NULL 
       AND jsonb_typeof(p_filters->'urgency_level') = 'array' 
       AND jsonb_array_length(p_filters->'urgency_level') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_urgency_levels
        FROM jsonb_array_elements_text(p_filters->'urgency_level');
    END IF;
    
    -- action_type filters by last_action_type (what action was taken)
    IF p_filters ? 'action_type' 
       AND p_filters->'action_type' IS NOT NULL 
       AND jsonb_typeof(p_filters->'action_type') = 'array'
       AND jsonb_array_length(p_filters->'action_type') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_action_types
        FROM jsonb_array_elements_text(p_filters->'action_type');
    END IF;
    
    IF p_filters ? 'batch_status' 
       AND p_filters->'batch_status' IS NOT NULL 
       AND jsonb_typeof(p_filters->'batch_status') = 'array'
       AND jsonb_array_length(p_filters->'batch_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_batch_statuses
        FROM jsonb_array_elements_text(p_filters->'batch_status');
    END IF;

    IF p_filters ? 'lifecycle_status' 
       AND p_filters->'lifecycle_status' IS NOT NULL 
       AND jsonb_typeof(p_filters->'lifecycle_status') = 'array'
       AND jsonb_array_length(p_filters->'lifecycle_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_lifecycle_statuses
        FROM jsonb_array_elements_text(p_filters->'lifecycle_status');
    END IF;

    -- Single query with window functions for counts
    RETURN QUERY
    WITH filtered_base AS (
        -- Base filtered data (no pagination yet)
        SELECT 
            bts.batch_id,
            bts.store_id,
            bts.batch_number,
            bts.expiry_date,
            bts.current_quantity,
            bts.available_quantity,
            bts.lifecycle_status,
            bts.batch_status,
            bts.product_name,
            bts.product_brand,
            bts.ai_recommendation,
            bts.composite_score,
            bts.urgency_level,
            bts.ai_calculated_at,
            bts.last_action_type,
            bts.last_action_time,
            bts.last_action_quantity,
            bts.last_discount_percent,
            bts.total_actions_ever,
            bts.total_discounted_quantity,
            bts.total_donated_quantity,
            bts.total_disposed_quantity,
            bts.total_sold_quantity,
            bts.total_ignored_quantity,
            bts.cost_price,
            bts.selling_price,
            bts.current_selling_price,
            bts.profit_margin,
            bts.profit_margin_percent,
            bts.potential_loss_value,
            bts.potential_revenue_value,
            bts.current_total_value,
            bts.unit_price,
            bts.completion_status,
            bts.todo_state,
            bts.priority_order,
            bts.days_to_expiry,
            bts.hours_since_last_action,
            bts.view_refreshed_at
        FROM inventory.batch_todo_states bts
        WHERE bts.store_id = p_store_id
          -- Completion status filter
          AND (v_completion_status IS NULL OR bts.completion_status = v_completion_status)
          -- Urgency level filter
          AND (v_urgency_levels IS NULL OR bts.urgency_level = ANY(v_urgency_levels))
          -- Action type filter (uses last_action_type - what action was taken)
          AND (v_action_types IS NULL OR bts.last_action_type::text = ANY(v_action_types))
          -- Batch status filter (disposition)
          AND (v_batch_statuses IS NULL OR bts.batch_status = ANY(v_batch_statuses))
          -- Lifecycle status filter (active/expired)
          AND (v_lifecycle_statuses IS NULL OR bts.lifecycle_status = ANY(v_lifecycle_statuses))
          -- Product name search
          AND (v_product_name IS NULL OR bts.product_name ILIKE '%' || v_product_name || '%')
          -- Days to expiry range
          AND (v_days_to_expiry_max IS NULL OR bts.days_to_expiry <= v_days_to_expiry_max)
          AND (v_days_to_expiry_min IS NULL OR bts.days_to_expiry >= v_days_to_expiry_min)
    ),
    with_counts AS (
        -- Add counts using window functions (calculated once across all filtered rows)
        SELECT 
            fb.*,
            COUNT(*) OVER() as total_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'pending') OVER() as pending_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'in_progress') OVER() as in_progress_count,
            COUNT(*) FILTER (WHERE fb.completion_status = 'completed') OVER() as completed_count,
            COUNT(*) FILTER (WHERE fb.lifecycle_status = 'active') OVER() as expiring_count,
            COUNT(*) FILTER (WHERE fb.lifecycle_status = 'expired') OVER() as expired_count
        FROM filtered_base fb
    )
    SELECT 
        wc.batch_id,
        wc.store_id,
        wc.batch_number,
        wc.expiry_date,
        wc.current_quantity,
        wc.available_quantity,
        wc.lifecycle_status,
        wc.batch_status,
        wc.product_name,
        wc.product_brand,
        wc.ai_recommendation,
        wc.composite_score,
        wc.urgency_level,
        wc.ai_calculated_at,
        wc.last_action_type,
        wc.last_action_time,
        wc.last_action_quantity,
        wc.last_discount_percent,
        wc.total_actions_ever,
        wc.total_discounted_quantity,
        wc.total_donated_quantity,
        wc.total_disposed_quantity,
        wc.total_sold_quantity,
        wc.total_ignored_quantity,
        wc.cost_price,
        wc.selling_price,
        wc.current_selling_price,
        wc.profit_margin,
        wc.profit_margin_percent,
        wc.potential_loss_value,
        wc.potential_revenue_value,
        wc.current_total_value,
        wc.unit_price,
        wc.completion_status,
        wc.todo_state,
        wc.priority_order,
        wc.days_to_expiry,
        wc.hours_since_last_action,
        wc.view_refreshed_at,
        wc.total_count,
        wc.pending_count,
        wc.in_progress_count,
        wc.completed_count,
        wc.expiring_count,
        wc.expired_count
    FROM with_counts wc
    ORDER BY 
        wc.priority_order ASC,
        wc.days_to_expiry ASC,
        wc.expiry_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_check_store_access(check_store_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'business'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM business.store_users su
    WHERE su.user_id = auth.uid()
      AND su.store_id = check_store_id
      AND su.is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION integrations.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

create or replace view "inventory"."automation_preview" as  SELECT b.batch_id,
    p.name AS product_name,
    p.brand,
    b.expiry_date,
    b.current_quantity,
    b.status AS current_status,
        CASE
            WHEN (b.current_quantity <= (0)::numeric) THEN 'sold_out'::character varying
            WHEN (b.expiry_date < CURRENT_DATE) THEN 'expired'::character varying
            ELSE b.status
        END AS would_become_status,
    (b.current_quantity * b.selling_price) AS potential_loss_value,
    s.store_name,
    (b.expiry_date - CURRENT_DATE) AS days_past_expiry
   FROM ((inventory.batches b
     JOIN inventory.products p ON ((b.product_id = p.product_id)))
     JOIN business.stores s ON ((b.store_id = s.store_id)))
  WHERE (((b.status)::text = 'active'::text) AND ((b.expiry_date < CURRENT_DATE) OR (b.current_quantity <= (0)::numeric)))
  ORDER BY b.expiry_date;


create or replace view "inventory"."batch_expiry_status" as  SELECT b.batch_id,
    b.product_id,
    b.store_id,
    b.expiry_date,
    b.current_quantity,
    b.created_at,
    p.name AS product_name,
    p.category_id,
    c.display_name_en AS category_name,
    c.category_code,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
        CASE
            WHEN ((b.expiry_date - CURRENT_DATE) <= 1) THEN 'Critical'::text
            WHEN ((b.expiry_date - CURRENT_DATE) <= 7) THEN 'Urgent'::text
            WHEN ((b.expiry_date - CURRENT_DATE) <= 14) THEN 'Warning'::text
            ELSE 'Normal'::text
        END AS urgency_level,
        CASE
            WHEN (b.expiry_date < CURRENT_DATE) THEN 'Expired'::text
            WHEN (b.current_quantity = (0)::numeric) THEN 'Empty'::text
            WHEN ((b.expiry_date - CURRENT_DATE) <= 7) THEN 'Expiring_Soon'::text
            ELSE 'Active'::text
        END AS status
   FROM ((inventory.batches b
     JOIN inventory.products p ON ((b.product_id = p.product_id)))
     LEFT JOIN inventory.categories c ON ((p.category_id = c.category_id)))
  WHERE (b.current_quantity > (0)::numeric)
  ORDER BY (b.expiry_date - CURRENT_DATE);


create or replace view "inventory"."batch_todo_states" as  WITH all_actions AS (
         SELECT DISTINCT ON (batch_actions.batch_id) batch_actions.batch_id,
            batch_actions.action_type AS last_action_type,
            batch_actions.performed_at AS last_action_time,
            batch_actions.quantity_affected AS last_action_quantity,
            batch_actions.discount_percentage AS last_discount_percent
           FROM inventory.batch_actions
          WHERE ((batch_actions.action_type IS NOT NULL) AND (batch_actions.performed_by IS NOT NULL) AND (batch_actions.quantity_affected > (0)::numeric))
          ORDER BY batch_actions.batch_id, batch_actions.performed_at DESC
        ), action_summary AS (
         SELECT batch_actions.batch_id,
            count(*) AS total_actions,
            sum(
                CASE
                    WHEN (batch_actions.action_type = 'discount'::public.action_type) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_discounted,
            sum(
                CASE
                    WHEN (batch_actions.action_type = ANY (ARRAY['donate'::public.action_type, 'donate_prepared'::public.action_type])) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_donated,
            sum(
                CASE
                    WHEN (batch_actions.action_type = 'dispose'::public.action_type) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_disposed,
            sum(
                CASE
                    WHEN (batch_actions.action_type = 'sold'::public.action_type) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_sold,
            sum(
                CASE
                    WHEN (batch_actions.action_type = 'ignored'::public.action_type) THEN batch_actions.quantity_affected
                    ELSE (0)::numeric
                END) AS total_ignored,
            max(batch_actions.performed_at) AS last_action_date
           FROM inventory.batch_actions
          WHERE (batch_actions.action_type IS NOT NULL)
          GROUP BY batch_actions.batch_id
        )
 SELECT b.batch_id,
    b.store_id,
    b.batch_number,
    b.expiry_date,
    b.current_quantity,
    b.available_quantity,
    b.lifecycle_status,
    b.status AS batch_status,
    p.name AS product_name,
    p.brand AS product_brand,
    ps.recommendation AS ai_recommendation,
    ps.composite_score,
    ps.urgency_level,
    ps.calculated_at AS ai_calculated_at,
    aa.last_action_type,
    aa.last_action_time,
    aa.last_action_quantity,
    aa.last_discount_percent,
    COALESCE(acs.total_actions, (0)::bigint) AS total_actions_ever,
    COALESCE(acs.total_discounted, (0)::numeric) AS total_discounted_quantity,
    COALESCE(acs.total_donated, (0)::numeric) AS total_donated_quantity,
    COALESCE(acs.total_disposed, (0)::numeric) AS total_disposed_quantity,
    COALESCE(acs.total_sold, (0)::numeric) AS total_sold_quantity,
    COALESCE(acs.total_ignored, (0)::numeric) AS total_ignored_quantity,
    b.cost_price,
    b.selling_price,
        CASE
            WHEN ((aa.last_action_type = 'discount'::public.action_type) AND (aa.last_discount_percent IS NOT NULL)) THEN (b.selling_price * ((1)::numeric - (aa.last_discount_percent / (100)::numeric)))
            ELSE b.selling_price
        END AS current_selling_price,
    (b.selling_price - COALESCE(b.cost_price, (0)::numeric)) AS profit_margin,
        CASE
            WHEN (COALESCE(b.cost_price, (0)::numeric) > (0)::numeric) THEN (((b.selling_price - COALESCE(b.cost_price, (0)::numeric)) / b.cost_price) * (100)::numeric)
            ELSE (0)::numeric
        END AS profit_margin_percent,
    (b.current_quantity * COALESCE(b.cost_price, (0)::numeric)) AS potential_loss_value,
    (b.current_quantity * COALESCE(b.selling_price, (0)::numeric)) AS potential_revenue_value,
    (b.current_quantity *
        CASE
            WHEN ((aa.last_action_type = 'discount'::public.action_type) AND (aa.last_discount_percent IS NOT NULL)) THEN (b.selling_price * ((1)::numeric - (aa.last_discount_percent / (100)::numeric)))
            ELSE b.selling_price
        END) AS current_total_value,
    COALESCE(b.selling_price, (0)::numeric) AS unit_price,
        CASE
            WHEN (b.current_quantity = (0)::numeric) THEN 'completed'::text
            WHEN (aa.last_action_type = 'ignored'::public.action_type) THEN 'completed'::text
            WHEN (aa.last_action_type = ANY (ARRAY['discount'::public.action_type, 'donate_prepared'::public.action_type])) THEN 'in_progress'::text
            WHEN ((aa.last_action_type = ANY (ARRAY['donate'::public.action_type, 'dispose'::public.action_type, 'sold'::public.action_type])) AND (b.current_quantity > (0)::numeric)) THEN 'in_progress'::text
            WHEN (aa.last_action_type IS NOT NULL) THEN 'in_progress'::text
            ELSE 'pending'::text
        END AS completion_status,
        CASE
            WHEN ((aa.last_action_type = 'ignored'::public.action_type) AND ((ps.calculated_at IS NULL) OR (aa.last_action_time >= ps.calculated_at))) THEN 'recently_ignored'::text
            WHEN ((ps.urgency_level = ANY (ARRAY['critical'::text, 'high'::text])) AND ((aa.last_action_time IS NULL) OR (aa.last_action_time < ps.calculated_at)) AND (b.current_quantity > (0)::numeric) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type))) THEN 'immediate_action'::text
            WHEN ((b.expiry_date >= (CURRENT_DATE - '7 days'::interval)) AND (b.expiry_date < CURRENT_DATE) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type)) AND (ps.urgency_level <> ALL (ARRAY['critical'::text, 'high'::text]))) THEN 'recently_expired'::text
            WHEN ((aa.last_action_time IS NOT NULL) AND (aa.last_action_time >= (now() - '24:00:00'::interval))) THEN
            CASE aa.last_action_type
                WHEN 'discount'::public.action_type THEN 'recently_discounted'::text
                WHEN 'donate_prepared'::public.action_type THEN 'ready_for_donation'::text
                WHEN 'donate'::public.action_type THEN 'recently_donated'::text
                WHEN 'dispose'::public.action_type THEN 'recently_disposed'::text
                WHEN 'sold'::public.action_type THEN 'recently_sold'::text
                WHEN 'ignored'::public.action_type THEN 'recently_ignored'::text
                ELSE 'recent_action'::text
            END
            WHEN ((aa.last_action_time IS NOT NULL) AND (aa.last_action_time < ps.calculated_at) AND (ps.calculated_at IS NOT NULL) AND (b.current_quantity > (0)::numeric) AND (aa.last_action_type <> 'ignored'::public.action_type)) THEN 'needs_reeval'::text
            WHEN (((ps.recommendation)::text = ANY ((ARRAY['discount_moderate'::character varying, 'discount_aggressive'::character varying, 'dispose'::character varying, 'alert'::character varying])::text[])) AND ((aa.last_action_time IS NULL) OR (aa.last_action_time < ps.calculated_at)) AND (b.current_quantity > (0)::numeric) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type)) AND (ps.urgency_level <> ALL (ARRAY['critical'::text, 'high'::text]))) THEN 'pending_action'::text
            WHEN (((ps.recommendation)::text = ANY ((ARRAY['maintain'::character varying, 'monitor'::character varying, 'normal'::character varying])::text[])) AND (b.current_quantity > (0)::numeric) AND ((aa.last_action_type IS NULL) OR (aa.last_action_type <> 'ignored'::public.action_type))) THEN 'monitor_only'::text
            ELSE 'unknown'::text
        END AS todo_state,
        CASE
            WHEN (ps.urgency_level = 'critical'::text) THEN 1
            WHEN (ps.urgency_level = 'high'::text) THEN 2
            WHEN (ps.urgency_level = 'medium'::text) THEN 3
            ELSE 4
        END AS priority_order,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
        CASE
            WHEN (aa.last_action_time IS NOT NULL) THEN (EXTRACT(epoch FROM (now() - (aa.last_action_time)::timestamp with time zone)) / (3600)::numeric)
            ELSE NULL::numeric
        END AS hours_since_last_action,
    now() AS view_refreshed_at
   FROM ((((inventory.batches b
     LEFT JOIN inventory.products p ON ((b.product_id = p.product_id)))
     LEFT JOIN scoring.product_scores ps ON ((b.batch_id = ps.batch_id)))
     LEFT JOIN all_actions aa ON ((b.batch_id = aa.batch_id)))
     LEFT JOIN action_summary acs ON ((b.batch_id = acs.batch_id)));


CREATE OR REPLACE FUNCTION inventory.check_batch_expiry_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Only check if this is an INSERT or if expiry_date was updated
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.expiry_date != NEW.expiry_date) THEN
        -- If the batch is already expired when created/updated, mark it as expired
        IF NEW.expiry_date < CURRENT_DATE THEN
            -- Update status if it's active
            IF NEW.status = 'active' THEN
                NEW.status = 'expired';
            END IF;
            -- Always update lifecycle_status to expired (this was missing!)
            NEW.lifecycle_status = 'expired';
            NEW.updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_action_statistics(p_store_id uuid, p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(action_type public.action_type, total_actions bigint, total_quantity numeric, total_original_value numeric, total_recovered_value numeric, avg_recovery_rate numeric, most_common_day_of_week text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'public'
AS $function$
  SELECT 
    bae.action_type,
    COUNT(*) as total_actions,
    SUM(bae.quantity_affected) as total_quantity,
    SUM(bae.total_original_value) as total_original_value,
    SUM(bae.total_recovered_value) as total_recovered_value,
    CASE 
      WHEN SUM(bae.total_original_value) > 0 THEN 
        ROUND((SUM(bae.total_recovered_value) / SUM(bae.total_original_value)) * 100, 2)
      ELSE 0 
    END as avg_recovery_rate,
    MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM bae.performed_at)) as most_common_day_of_week
  FROM batch_action_entries bae
  JOIN batches b ON b.batch_id = bae.batch_id
  WHERE b.store_id = p_store_id
  AND DATE(bae.performed_at) BETWEEN p_start_date AND p_end_date
  GROUP BY bae.action_type
  ORDER BY total_quantity DESC;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_batch_action_breakdown(p_batch_id uuid)
 RETURNS TABLE(batch_id uuid, batch_number character varying, product_name character varying, initial_quantity numeric, current_quantity numeric, action_type public.action_type, quantity_affected numeric, percentage_of_batch numeric, original_value numeric, recovered_value numeric, discount_percentage numeric, donation_recipient_name character varying, disposal_reason text, performed_by_name text, performed_at timestamp without time zone, verified_at timestamp without time zone, notes text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'auth', 'public'
AS $function$
  SELECT 
    b.batch_id,
    b.batch_number,
    p.name as product_name,
    b.initial_quantity,
    b.current_quantity,
    bae.action_type,
    bae.quantity_affected,
    CASE 
      WHEN b.initial_quantity > 0 THEN 
        ROUND((bae.quantity_affected / b.initial_quantity) * 100, 2)
      ELSE 0 
    END as percentage_of_batch,
    bae.total_original_value as original_value,
    bae.total_recovered_value as recovered_value,
    bae.discount_percentage,
    dr.name as donation_recipient_name,
    bae.disposal_reason,
    COALESCE(
      (SELECT email FROM auth.users WHERE id = bae.performed_by),
      'Unknown User'
    ) as performed_by_name,
    bae.performed_at,
    bae.verified_at,
    bae.notes
  FROM batches b
  JOIN products p ON p.product_id = b.product_id
  LEFT JOIN batch_action_entries bae ON bae.batch_id = b.batch_id
  LEFT JOIN donation_recipients dr ON dr.recipient_id = bae.donation_recipient_id
  WHERE b.batch_id = p_batch_id
  AND b.store_id IN (
    SELECT store_id FROM store_users 
    WHERE user_id = auth.uid()
  )
  ORDER BY bae.performed_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_donation_recipients(p_store_id uuid)
 RETURNS TABLE(recipient_id uuid, name character varying, recipient_type public.donation_recipient_type, contact_email character varying, contact_phone character varying, is_certified boolean, accepts_pickups boolean, max_distance_km integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'public'
AS $function$
  SELECT 
    dr.recipient_id,
    dr.name,
    dr.recipient_type,
    dr.contact_email,
    dr.contact_phone,
    dr.is_certified,
    dr.accepts_pickups,
    dr.max_distance_km
  FROM donation_recipients dr
  WHERE dr.store_id = p_store_id
  AND dr.is_active = true
  ORDER BY dr.name;
$function$
;

CREATE OR REPLACE FUNCTION inventory.get_recent_actions(p_store_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(entry_id uuid, batch_number character varying, product_name character varying, action_type public.action_type, quantity_affected numeric, original_value numeric, recovered_value numeric, performed_by_email text, performed_at timestamp without time zone, notes text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'inventory', 'business', 'auth', 'public'
AS $function$
  SELECT 
    bae.entry_id,
    b.batch_number,
    p.name as product_name,
    bae.action_type,
    bae.quantity_affected,
    bae.total_original_value as original_value,
    bae.total_recovered_value as recovered_value,
    COALESCE(u.email, 'Unknown User') as performed_by_email,
    bae.performed_at,
    bae.notes
  FROM batch_action_entries bae
  JOIN batches b ON b.batch_id = bae.batch_id
  JOIN products p ON p.product_id = b.product_id
  LEFT JOIN users u ON u.id = bae.performed_by
  WHERE b.store_id = p_store_id
  ORDER BY bae.performed_at DESC
  LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_discount_action(p_batch_id uuid, p_quantity_affected numeric, p_discount_percentage numeric, p_user_id uuid, p_notes text DEFAULT NULL::text, p_recommended_action text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_discounted_price DECIMAL;
  v_potential_revenue DECIMAL;
  v_valid_recommended_action public.action_type;
BEGIN
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  IF p_quantity_affected > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Cannot discount % units when only % available', p_quantity_affected, v_batch.current_quantity;
  END IF;

  -- Calculate the new discounted price
  v_discounted_price := v_batch.selling_price * (1 - p_discount_percentage / 100);
  -- Potential revenue if all discounted items sell
  v_potential_revenue := p_quantity_affected * v_discounted_price;

  -- Validate recommended_action
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  -- Record the discount action (but DON'T reduce quantity - items still on shelf!)
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    discount_percentage, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'discount'::public.action_type,
    v_valid_recommended_action,
    p_quantity_affected,
    p_quantity_affected * v_batch.selling_price,  -- Original value
    v_potential_revenue,  -- Potential recovered value if sold at discount
    p_discount_percentage, p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  -- Update batch: DON'T change quantity, just update timestamp
  -- The quantity only changes when items are actually SOLD
  UPDATE inventory.batches
  SET updated_at = NOW()
  WHERE batch_id = p_batch_id;

  -- Mark as in_progress in scoring - discount applied, waiting for sale
  -- NOTE: urgency_level is NOT updated here - managed by daily cron job scoring
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET 
      status = 'in_progress',  -- Discount applied, items still on shelf
      discount_percent = p_discount_percentage::integer
      -- urgency_level managed by cron job scoring based on expiry date
    WHERE batch_id = p_batch_id;
  END IF;

  -- Record in analytics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'discount',
      v_batch.selling_price, v_discounted_price, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_batch.current_quantity,  -- Unchanged!
    'potential_revenue', v_potential_revenue,
    'discounted_price', v_discounted_price
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_dismiss_action(p_batch_id uuid, p_dismissal_reason text, p_user_id uuid, p_notes text DEFAULT NULL::text, p_recommended_action text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_valid_recommended_action public.action_type;
BEGIN
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  -- Validate recommended_action
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action,
    dismissal_reason, performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'ignored'::public.action_type,
    v_valid_recommended_action,
    p_dismissal_reason, p_user_id, v_batch.initial_quantity, p_notes
  );

  -- Mark as dismissed, PRESERVE AI recommendation
  -- NOTE: urgency_level is NOT updated here - managed by daily cron job scoring
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'dismissed',  -- User explicitly ignored AI recommendation
        completed_at = NOW()
        -- urgency_level managed by cron job scoring based on expiry date
        -- recommendation preserved!
    WHERE batch_id = p_batch_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Recommendation dismissed'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_dispose_action(p_batch_id uuid, p_quantity_disposed numeric, p_disposal_reason text, p_user_id uuid, p_notes text DEFAULT NULL::text, p_recommended_action text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_original_value DECIMAL;
  v_new_quantity NUMERIC;
  v_valid_recommended_action public.action_type;
BEGIN
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  IF p_quantity_disposed > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Cannot dispose % units when only % available', p_quantity_disposed, v_batch.current_quantity;
  END IF;

  v_original_value := p_quantity_disposed * v_batch.selling_price;

  -- Validate recommended_action
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, disposal_reason,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'dispose'::public.action_type,
    v_valid_recommended_action,
    p_quantity_disposed, v_original_value, p_disposal_reason,
    p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_disposed,
      status = CASE
        WHEN current_quantity - p_quantity_disposed <= 0 THEN 'disposed'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id
  RETURNING current_quantity INTO v_new_quantity;

  -- Mark as completed, PRESERVE AI recommendation
  -- NOTE: urgency_level is NOT updated here - managed by daily cron job scoring
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW()
        -- urgency_level managed by cron job scoring based on expiry date
        -- recommendation preserved!
    WHERE batch_id = p_batch_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'dispose',
      v_batch.selling_price, 0, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_new_quantity,
    'waste_value', v_original_value
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_donate_action(p_batch_id uuid, p_quantity_affected numeric, p_donation_recipient_id uuid, p_user_id uuid, p_notes text DEFAULT NULL::text, p_recommended_action text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_original_value DECIMAL;
  v_new_quantity NUMERIC;
  v_valid_recommended_action public.action_type;
BEGIN
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  IF p_quantity_affected > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Cannot donate % units when only % available', p_quantity_affected, v_batch.current_quantity;
  END IF;

  v_original_value := p_quantity_affected * v_batch.selling_price;

  -- Validate recommended_action
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, donation_recipient_id,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'donate'::public.action_type,
    v_valid_recommended_action,
    p_quantity_affected, v_original_value, p_donation_recipient_id,
    p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_affected,
      status = CASE
        WHEN current_quantity - p_quantity_affected <= 0 THEN 'donated'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id
  RETURNING current_quantity INTO v_new_quantity;

  -- Mark as completed, PRESERVE AI recommendation
  -- NOTE: urgency_level is NOT updated here - managed by daily cron job scoring
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW()
        -- urgency_level managed by cron job scoring based on expiry date
        -- recommendation preserved!
    WHERE batch_id = p_batch_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'donate',
      v_batch.selling_price, 0, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_new_quantity,
    'original_value', v_original_value
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_sold_action(p_batch_id uuid, p_quantity_sold numeric, p_user_id uuid, p_notes text DEFAULT NULL::text, p_recommended_action text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_batch inventory.batches%ROWTYPE;
  v_entry_id UUID;
  v_revenue_recovered DECIMAL;
  v_new_quantity NUMERIC;
  v_valid_recommended_action public.action_type;
BEGIN
  -- Get batch with row-level lock
  SELECT * INTO v_batch
  FROM inventory.batches
  WHERE batch_id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  -- SECURITY: Verify user has access to this store
  IF NOT EXISTS (
    SELECT 1 FROM business.store_users
    WHERE user_id = p_user_id
    AND store_id = v_batch.store_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User % does not have access to store %', p_user_id, v_batch.store_id;
  END IF;

  IF p_quantity_sold > v_batch.current_quantity THEN
    RAISE EXCEPTION 'Cannot sell % units when only % available', p_quantity_sold, v_batch.current_quantity;
  END IF;

  v_revenue_recovered := p_quantity_sold * v_batch.selling_price;

  -- Validate recommended_action is a valid enum value
  IF p_recommended_action IS NOT NULL THEN
    BEGIN
      v_valid_recommended_action := p_recommended_action::public.action_type;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Invalid enum value provided, set to NULL instead of failing
      v_valid_recommended_action := NULL;
      RAISE WARNING 'Invalid recommended_action value: %. Using NULL instead.', p_recommended_action;
    END;
  END IF;

  -- Record the action with AI recommendation (PRESERVED IN batch_actions)
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    total_original_value, total_recovered_value,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'sold'::public.action_type,
    v_valid_recommended_action,  -- AI recommendation preserved here
    p_quantity_sold, v_revenue_recovered, v_revenue_recovered,
    p_user_id, v_batch.initial_quantity, p_notes
  ) RETURNING entry_id INTO v_entry_id;

  -- Update inventory and get new quantity
  UPDATE inventory.batches
  SET current_quantity = current_quantity - p_quantity_sold,
      status = CASE
        WHEN current_quantity - p_quantity_sold <= 0 THEN 'sold_out'
        ELSE status
      END,
      updated_at = NOW()
  WHERE batch_id = p_batch_id
  RETURNING current_quantity INTO v_new_quantity;

  -- Mark as completed in scoring, but PRESERVE AI recommendation
  -- NOTE: urgency_level is NOT updated here - managed by daily cron job scoring
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',  -- Track that action was taken
        completed_at = NOW()   -- Record when
        -- urgency_level managed by cron job scoring based on expiry date
        -- NOTE: recommendation field is NOT updated - preserves AI's original suggestion!
    WHERE batch_id = p_batch_id;
  END IF;

  -- Track for analytics (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'sold',
      v_batch.selling_price, v_batch.selling_price, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_new_quantity,
    'revenue_recovered', v_revenue_recovered
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_todos_counts_with_filters(p_store_id uuid, p_filters jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_urgency_levels TEXT[];
    v_action_types TEXT[];
    v_batch_statuses TEXT[];
    v_lifecycle_statuses TEXT[];  -- NEW
    v_product_name TEXT;
    v_days_to_expiry_min INT;
    v_days_to_expiry_max INT;
BEGIN
    -- Extract filter values from JSONB
    v_urgency_levels := ARRAY(SELECT jsonb_array_elements_text(p_filters->'urgency_level'));
    v_action_types := ARRAY(SELECT jsonb_array_elements_text(p_filters->'action_type'));
    v_batch_statuses := ARRAY(SELECT jsonb_array_elements_text(p_filters->'batch_status'));
    v_lifecycle_statuses := ARRAY(SELECT jsonb_array_elements_text(p_filters->'lifecycle_status'));  -- NEW
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::INT;
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::INT;

    -- Use a CTE to filter once and count multiple times for better performance
    RETURN (
        WITH filtered_todos AS (
            SELECT 
                completion_status,
                batch_status,
                lifecycle_status,  -- NEW: Include lifecycle_status
                days_to_expiry
            FROM inventory.batch_todo_states
            WHERE store_id = p_store_id
              -- Apply universal filters
              AND (COALESCE(array_length(v_urgency_levels, 1), 0) = 0 OR urgency_level = ANY(v_urgency_levels))
              AND (COALESCE(array_length(v_action_types, 1), 0) = 0 OR ai_recommendation::text = ANY(v_action_types))
              AND (v_product_name IS NULL OR v_product_name = '' OR product_name ILIKE '%' || v_product_name || '%')
              -- NEW: Apply lifecycle_status filter if provided
              AND (COALESCE(array_length(v_lifecycle_statuses, 1), 0) = 0 OR lifecycle_status = ANY(v_lifecycle_statuses))
        )
        SELECT jsonb_build_object(
            'pending', 
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE completion_status = 'pending'
               AND (COALESCE(array_length(v_batch_statuses, 1), 0) = 0 OR batch_status = ANY(v_batch_statuses))
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'in_progress',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE completion_status = 'in_progress'
               AND (COALESCE(array_length(v_batch_statuses, 1), 0) = 0 OR batch_status = ANY(v_batch_statuses))
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'completed',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE completion_status = 'completed'
               AND (COALESCE(array_length(v_batch_statuses, 1), 0) = 0 OR batch_status = ANY(v_batch_statuses))
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'expiring',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE lifecycle_status = 'active'  -- CHANGED: was batch_status = 'active'
               AND days_to_expiry >= COALESCE(v_days_to_expiry_min, 0)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max)),
            
            'expired',
            (SELECT COUNT(*) FROM filtered_todos 
             WHERE lifecycle_status = 'expired'  -- CHANGED: was batch_status = 'expired'
               AND (v_days_to_expiry_min IS NULL OR days_to_expiry >= v_days_to_expiry_min)
               AND (v_days_to_expiry_max IS NULL OR days_to_expiry <= v_days_to_expiry_max))
        )
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_todos_dashboard(p_store_id uuid)
 RETURNS TABLE(batch_id uuid, batch_number character varying, product_name character varying, product_brand character varying, expiry_date date, current_quantity numeric, days_to_expiry integer, urgency_level text, ai_recommendation character varying, composite_score numeric, last_action_type public.action_type, last_action_time timestamp without time zone, last_discount_percent numeric, completion_status text, todo_state text, priority_order integer, hours_since_last_action numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'inventory', 'scoring'
AS $function$
DECLARE
  user_store_access BOOLEAN := FALSE;
BEGIN
  -- Check if user has access to this store (respects RLS)
  SELECT EXISTS(
    SELECT 1 FROM business.stores s 
    WHERE s.store_id = p_store_id
  ) INTO user_store_access;
  
  -- If no access, return empty
  IF NOT user_store_access THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    bts.batch_id,
    bts.batch_number,
    bts.product_name,
    bts.product_brand,
    bts.expiry_date,
    bts.current_quantity,
    bts.days_to_expiry,
    bts.urgency_level,
    bts.ai_recommendation,
    bts.composite_score,
    bts.last_action_type,
    bts.last_action_time,
    bts.last_discount_percent,
    bts.completion_status,
    bts.todo_state,
    bts.priority_order,
    bts.hours_since_last_action
  FROM inventory.batch_todo_states bts
  WHERE bts.store_id = p_store_id
    AND (
      bts.current_quantity > 0 OR  -- Active batches
      (bts.completion_status = 'completed' AND bts.last_action_time >= CURRENT_DATE)  -- Today's completed items
    )
  ORDER BY 
    bts.priority_order ASC,
    bts.days_to_expiry ASC,
    bts.composite_score DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_todos_with_filters(p_store_id uuid, p_filters jsonb, p_limit integer, p_offset integer)
 RETURNS TABLE(batch_id uuid, store_id uuid, batch_number character varying, expiry_date date, current_quantity numeric, available_quantity numeric, lifecycle_status character varying, batch_status character varying, product_name character varying, product_brand character varying, ai_recommendation character varying, composite_score numeric, urgency_level text, ai_calculated_at timestamp without time zone, last_action_type public.action_type, last_action_time timestamp without time zone, last_action_quantity numeric, last_discount_percent numeric, total_actions_ever bigint, total_discounted_quantity numeric, total_donated_quantity numeric, total_disposed_quantity numeric, total_sold_quantity numeric, total_ignored_quantity numeric, cost_price numeric, selling_price numeric, current_selling_price numeric, profit_margin numeric, profit_margin_percent numeric, potential_loss_value numeric, potential_revenue_value numeric, current_total_value numeric, unit_price numeric, completion_status text, todo_state text, priority_order integer, days_to_expiry integer, hours_since_last_action numeric, view_refreshed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_completion_status text;
    v_urgency_levels text[];
    v_action_types text[];
    v_batch_statuses text[];
    v_lifecycle_statuses text[];  -- NEW
    v_product_name text;
    v_days_to_expiry_max integer;
    v_days_to_expiry_min integer;
BEGIN
    -- Extract filter parameters from JSONB
    v_completion_status := p_filters->>'completion_status';
    v_product_name := p_filters->>'product_name';
    v_days_to_expiry_max := (p_filters->>'days_to_expiry_max')::integer;
    v_days_to_expiry_min := (p_filters->>'days_to_expiry_min')::integer;
    
    -- Extract arrays from JSONB (with proper null and type checking)
    IF p_filters ? 'urgency_level' 
       AND p_filters->'urgency_level' IS NOT NULL 
       AND jsonb_typeof(p_filters->'urgency_level') = 'array' 
       AND jsonb_array_length(p_filters->'urgency_level') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_urgency_levels
        FROM jsonb_array_elements_text(p_filters->'urgency_level');
    END IF;
    
    IF p_filters ? 'action_type' 
       AND p_filters->'action_type' IS NOT NULL 
       AND jsonb_typeof(p_filters->'action_type') = 'array'
       AND jsonb_array_length(p_filters->'action_type') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_action_types
        FROM jsonb_array_elements_text(p_filters->'action_type');
    END IF;
    
    IF p_filters ? 'batch_status' 
       AND p_filters->'batch_status' IS NOT NULL 
       AND jsonb_typeof(p_filters->'batch_status') = 'array'
       AND jsonb_array_length(p_filters->'batch_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_batch_statuses
        FROM jsonb_array_elements_text(p_filters->'batch_status');
    END IF;

    -- NEW: Extract lifecycle_status filter
    IF p_filters ? 'lifecycle_status' 
       AND p_filters->'lifecycle_status' IS NOT NULL 
       AND jsonb_typeof(p_filters->'lifecycle_status') = 'array'
       AND jsonb_array_length(p_filters->'lifecycle_status') > 0 THEN
        SELECT array_agg(value::text)
        INTO v_lifecycle_statuses
        FROM jsonb_array_elements_text(p_filters->'lifecycle_status');
    END IF;

    -- Query the view with filters
    RETURN QUERY
    SELECT 
        bts.batch_id,
        bts.store_id,
        bts.batch_number,
        bts.expiry_date,
        bts.current_quantity,
        bts.available_quantity,
        bts.lifecycle_status,  -- NEW
        bts.batch_status,
        bts.product_name,
        bts.product_brand,
        bts.ai_recommendation,
        bts.composite_score,
        bts.urgency_level,
        bts.ai_calculated_at,
        bts.last_action_type,
        bts.last_action_time,
        bts.last_action_quantity,
        bts.last_discount_percent,
        bts.total_actions_ever,
        bts.total_discounted_quantity,
        bts.total_donated_quantity,
        bts.total_disposed_quantity,
        bts.total_sold_quantity,
        bts.total_ignored_quantity,
        bts.cost_price,
        bts.selling_price,
        bts.current_selling_price,
        bts.profit_margin,
        bts.profit_margin_percent,
        bts.potential_loss_value,
        bts.potential_revenue_value,
        bts.current_total_value,
        bts.unit_price,
        bts.completion_status,
        bts.todo_state,
        bts.priority_order,
        bts.days_to_expiry,
        bts.hours_since_last_action,
        bts.view_refreshed_at
    FROM inventory.batch_todo_states bts
    WHERE bts.store_id = p_store_id
      AND (v_completion_status IS NULL OR bts.completion_status = v_completion_status)
      AND (v_urgency_levels IS NULL OR bts.urgency_level = ANY(v_urgency_levels))
      AND (v_action_types IS NULL OR bts.last_action_type::text = ANY(v_action_types))
      AND (v_batch_statuses IS NULL OR bts.batch_status = ANY(v_batch_statuses))
      AND (v_lifecycle_statuses IS NULL OR bts.lifecycle_status = ANY(v_lifecycle_statuses))  -- NEW
      AND (v_product_name IS NULL OR bts.product_name ILIKE '%' || v_product_name || '%')
      AND (v_days_to_expiry_max IS NULL OR bts.days_to_expiry <= v_days_to_expiry_max)
      AND (v_days_to_expiry_min IS NULL OR bts.days_to_expiry >= v_days_to_expiry_min)
    ORDER BY 
        bts.priority_order ASC,
        bts.days_to_expiry ASC,
        bts.expiry_date ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
;

create or replace view "public"."inventory_view_for_scoring" as  SELECT b.batch_id,
    b.product_id,
    p.sku,
    c.display_name_en AS category,
    c.category_code,
    b.current_quantity,
    b.expiry_date,
    b.selling_price,
    b.cost_price,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
    COALESCE(c.typical_shelf_life_days, p.typical_shelf_life_days, 30) AS typical_shelf_life_days,
    b.store_id
   FROM ((inventory.batches b
     JOIN inventory.products p ON ((b.product_id = p.product_id)))
     JOIN inventory.categories c ON ((p.category_id = c.category_id)))
  WHERE ((b.status)::text = 'active'::text);


CREATE OR REPLACE FUNCTION public.update_expired_batch_statuses()
 RETURNS TABLE(total_updated integer, sold_out_count integer, expired_count integer, details jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  sold_out_updated INTEGER := 0;
  expired_updated INTEGER := 0;
  lifecycle_updated INTEGER := 0;
  v_total_updated INTEGER := 0;
BEGIN
  -- Update batches that have no remaining quantity to sold_out
  WITH sold_out_updates AS (
    UPDATE inventory.batches 
    SET 
      status = 'sold_out',
      updated_at = NOW()
    WHERE status = 'active' 
      AND current_quantity <= 0
    RETURNING batch_id
  )
  SELECT COUNT(*) INTO sold_out_updated FROM sold_out_updates;
  
  -- Update batches that have expired but still have quantity to expired (status column)
  WITH expired_updates AS (
    UPDATE inventory.batches 
    SET 
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'active' 
      AND expiry_date < CURRENT_DATE 
      AND current_quantity > 0
    RETURNING batch_id
  )
  SELECT COUNT(*) INTO expired_updated FROM expired_updates;

  -- NEW: Update lifecycle_status for ALL batches that are past expiry date
  -- This updates lifecycle_status regardless of disposition status
  WITH lifecycle_updates AS (
    UPDATE inventory.batches 
    SET 
      lifecycle_status = 'expired',
      updated_at = NOW()
    WHERE lifecycle_status = 'active' 
      AND expiry_date < CURRENT_DATE
    RETURNING batch_id
  )
  SELECT COUNT(*) INTO lifecycle_updated FROM lifecycle_updates;
  
  v_total_updated := sold_out_updated + expired_updated;
  
  -- Log the batch status update
  INSERT INTO inventory.batch_status_logs (
    action_type,
    affected_count,
    executed_at,
    notes
  ) VALUES (
    'automated_status_update',
    v_total_updated,
    NOW(),
    format('Automated daily update: %s sold_out, %s expired (status), %s expired (lifecycle)', 
           sold_out_updated, expired_updated, lifecycle_updated)
  );
  
  -- Return summary
  RETURN QUERY SELECT 
    v_total_updated,
    sold_out_updated,
    expired_updated,
    jsonb_build_object(
      'timestamp', NOW(),
      'sold_out_count', sold_out_updated,
      'expired_count', expired_updated,
      'lifecycle_expired_count', lifecycle_updated,
      'total_updated', v_total_updated
    );
END;
$function$
;

create or replace view "scoring"."recommendation_accuracy" as  SELECT ps.batch_id,
    ps.store_id,
    ps.recommendation AS ai_recommended,
    ba.action_type AS user_action,
    ps.composite_score,
    ps.urgency_level,
    ps.status,
    ps.calculated_at AS ai_scored_at,
    ps.completed_at AS action_taken_at,
    ba.performed_by,
    ba.quantity_affected,
    ba.total_original_value,
    ba.total_recovered_value,
        CASE
            WHEN ((ba.action_type)::text = (ps.recommendation)::text) THEN true
            WHEN ((ba.action_type = 'discount'::public.action_type) AND ((ps.recommendation)::text = ANY (ARRAY[('discount_aggressive'::character varying)::text, ('discount_moderate'::character varying)::text, ('discount_light'::character varying)::text]))) THEN true
            ELSE false
        END AS user_followed_ai,
        CASE
            WHEN (ba.total_original_value > (0)::numeric) THEN ((ba.total_recovered_value / ba.total_original_value) * (100)::numeric)
            ELSE (0)::numeric
        END AS recovery_rate_percent
   FROM (scoring.product_scores ps
     LEFT JOIN inventory.batch_actions ba ON ((ba.batch_id = ps.batch_id)))
  WHERE (ps.status = ANY (ARRAY['completed'::text, 'dismissed'::text]))
  ORDER BY ps.completed_at DESC;


grant delete on table "public"."batch_actions" to "anon";

grant insert on table "public"."batch_actions" to "anon";

grant references on table "public"."batch_actions" to "anon";

grant select on table "public"."batch_actions" to "anon";

grant trigger on table "public"."batch_actions" to "anon";

grant truncate on table "public"."batch_actions" to "anon";

grant update on table "public"."batch_actions" to "anon";

grant delete on table "public"."batch_actions" to "authenticated";

grant insert on table "public"."batch_actions" to "authenticated";

grant references on table "public"."batch_actions" to "authenticated";

grant select on table "public"."batch_actions" to "authenticated";

grant trigger on table "public"."batch_actions" to "authenticated";

grant truncate on table "public"."batch_actions" to "authenticated";

grant update on table "public"."batch_actions" to "authenticated";

grant delete on table "public"."batch_actions" to "service_role";

grant insert on table "public"."batch_actions" to "service_role";

grant references on table "public"."batch_actions" to "service_role";

grant select on table "public"."batch_actions" to "service_role";

grant trigger on table "public"."batch_actions" to "service_role";

grant truncate on table "public"."batch_actions" to "service_role";

grant update on table "public"."batch_actions" to "service_role";

grant delete on table "public"."batches" to "anon";

grant insert on table "public"."batches" to "anon";

grant references on table "public"."batches" to "anon";

grant select on table "public"."batches" to "anon";

grant trigger on table "public"."batches" to "anon";

grant truncate on table "public"."batches" to "anon";

grant update on table "public"."batches" to "anon";

grant delete on table "public"."batches" to "authenticated";

grant insert on table "public"."batches" to "authenticated";

grant references on table "public"."batches" to "authenticated";

grant select on table "public"."batches" to "authenticated";

grant trigger on table "public"."batches" to "authenticated";

grant truncate on table "public"."batches" to "authenticated";

grant update on table "public"."batches" to "authenticated";

grant delete on table "public"."batches" to "service_role";

grant insert on table "public"."batches" to "service_role";

grant references on table "public"."batches" to "service_role";

grant select on table "public"."batches" to "service_role";

grant trigger on table "public"."batches" to "service_role";

grant truncate on table "public"."batches" to "service_role";

grant update on table "public"."batches" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."category_weights" to "anon";

grant insert on table "public"."category_weights" to "anon";

grant references on table "public"."category_weights" to "anon";

grant select on table "public"."category_weights" to "anon";

grant trigger on table "public"."category_weights" to "anon";

grant truncate on table "public"."category_weights" to "anon";

grant update on table "public"."category_weights" to "anon";

grant delete on table "public"."category_weights" to "authenticated";

grant insert on table "public"."category_weights" to "authenticated";

grant references on table "public"."category_weights" to "authenticated";

grant select on table "public"."category_weights" to "authenticated";

grant trigger on table "public"."category_weights" to "authenticated";

grant truncate on table "public"."category_weights" to "authenticated";

grant update on table "public"."category_weights" to "authenticated";

grant delete on table "public"."category_weights" to "service_role";

grant insert on table "public"."category_weights" to "service_role";

grant references on table "public"."category_weights" to "service_role";

grant select on table "public"."category_weights" to "service_role";

grant trigger on table "public"."category_weights" to "service_role";

grant truncate on table "public"."category_weights" to "service_role";

grant update on table "public"."category_weights" to "service_role";

grant delete on table "public"."donation_recipients" to "anon";

grant insert on table "public"."donation_recipients" to "anon";

grant references on table "public"."donation_recipients" to "anon";

grant select on table "public"."donation_recipients" to "anon";

grant trigger on table "public"."donation_recipients" to "anon";

grant truncate on table "public"."donation_recipients" to "anon";

grant update on table "public"."donation_recipients" to "anon";

grant delete on table "public"."donation_recipients" to "authenticated";

grant insert on table "public"."donation_recipients" to "authenticated";

grant references on table "public"."donation_recipients" to "authenticated";

grant select on table "public"."donation_recipients" to "authenticated";

grant trigger on table "public"."donation_recipients" to "authenticated";

grant truncate on table "public"."donation_recipients" to "authenticated";

grant update on table "public"."donation_recipients" to "authenticated";

grant delete on table "public"."donation_recipients" to "service_role";

grant insert on table "public"."donation_recipients" to "service_role";

grant references on table "public"."donation_recipients" to "service_role";

grant select on table "public"."donation_recipients" to "service_role";

grant trigger on table "public"."donation_recipients" to "service_role";

grant truncate on table "public"."donation_recipients" to "service_role";

grant update on table "public"."donation_recipients" to "service_role";

grant delete on table "public"."external_factors" to "anon";

grant insert on table "public"."external_factors" to "anon";

grant references on table "public"."external_factors" to "anon";

grant select on table "public"."external_factors" to "anon";

grant trigger on table "public"."external_factors" to "anon";

grant truncate on table "public"."external_factors" to "anon";

grant update on table "public"."external_factors" to "anon";

grant delete on table "public"."external_factors" to "authenticated";

grant insert on table "public"."external_factors" to "authenticated";

grant references on table "public"."external_factors" to "authenticated";

grant select on table "public"."external_factors" to "authenticated";

grant trigger on table "public"."external_factors" to "authenticated";

grant truncate on table "public"."external_factors" to "authenticated";

grant update on table "public"."external_factors" to "authenticated";

grant delete on table "public"."external_factors" to "service_role";

grant insert on table "public"."external_factors" to "service_role";

grant references on table "public"."external_factors" to "service_role";

grant select on table "public"."external_factors" to "service_role";

grant trigger on table "public"."external_factors" to "service_role";

grant truncate on table "public"."external_factors" to "service_role";

grant update on table "public"."external_factors" to "service_role";

grant delete on table "public"."inventory_snapshots" to "anon";

grant insert on table "public"."inventory_snapshots" to "anon";

grant references on table "public"."inventory_snapshots" to "anon";

grant select on table "public"."inventory_snapshots" to "anon";

grant trigger on table "public"."inventory_snapshots" to "anon";

grant truncate on table "public"."inventory_snapshots" to "anon";

grant update on table "public"."inventory_snapshots" to "anon";

grant delete on table "public"."inventory_snapshots" to "authenticated";

grant insert on table "public"."inventory_snapshots" to "authenticated";

grant references on table "public"."inventory_snapshots" to "authenticated";

grant select on table "public"."inventory_snapshots" to "authenticated";

grant trigger on table "public"."inventory_snapshots" to "authenticated";

grant truncate on table "public"."inventory_snapshots" to "authenticated";

grant update on table "public"."inventory_snapshots" to "authenticated";

grant delete on table "public"."inventory_snapshots" to "service_role";

grant insert on table "public"."inventory_snapshots" to "service_role";

grant references on table "public"."inventory_snapshots" to "service_role";

grant select on table "public"."inventory_snapshots" to "service_role";

grant trigger on table "public"."inventory_snapshots" to "service_role";

grant truncate on table "public"."inventory_snapshots" to "service_role";

grant update on table "public"."inventory_snapshots" to "service_role";

grant delete on table "public"."product_scores" to "anon";

grant insert on table "public"."product_scores" to "anon";

grant references on table "public"."product_scores" to "anon";

grant select on table "public"."product_scores" to "anon";

grant trigger on table "public"."product_scores" to "anon";

grant truncate on table "public"."product_scores" to "anon";

grant update on table "public"."product_scores" to "anon";

grant delete on table "public"."product_scores" to "authenticated";

grant insert on table "public"."product_scores" to "authenticated";

grant references on table "public"."product_scores" to "authenticated";

grant select on table "public"."product_scores" to "authenticated";

grant trigger on table "public"."product_scores" to "authenticated";

grant truncate on table "public"."product_scores" to "authenticated";

grant update on table "public"."product_scores" to "authenticated";

grant delete on table "public"."product_scores" to "service_role";

grant insert on table "public"."product_scores" to "service_role";

grant references on table "public"."product_scores" to "service_role";

grant select on table "public"."product_scores" to "service_role";

grant trigger on table "public"."product_scores" to "service_role";

grant truncate on table "public"."product_scores" to "service_role";

grant update on table "public"."product_scores" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant references on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant trigger on table "public"."products" to "anon";

grant truncate on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant references on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant trigger on table "public"."products" to "authenticated";

grant truncate on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant delete on table "public"."roles" to "authenticated";

grant insert on table "public"."roles" to "authenticated";

grant references on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant update on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."sales_events" to "anon";

grant insert on table "public"."sales_events" to "anon";

grant references on table "public"."sales_events" to "anon";

grant select on table "public"."sales_events" to "anon";

grant trigger on table "public"."sales_events" to "anon";

grant truncate on table "public"."sales_events" to "anon";

grant update on table "public"."sales_events" to "anon";

grant delete on table "public"."sales_events" to "authenticated";

grant insert on table "public"."sales_events" to "authenticated";

grant references on table "public"."sales_events" to "authenticated";

grant select on table "public"."sales_events" to "authenticated";

grant trigger on table "public"."sales_events" to "authenticated";

grant truncate on table "public"."sales_events" to "authenticated";

grant update on table "public"."sales_events" to "authenticated";

grant delete on table "public"."sales_events" to "service_role";

grant insert on table "public"."sales_events" to "service_role";

grant references on table "public"."sales_events" to "service_role";

grant select on table "public"."sales_events" to "service_role";

grant trigger on table "public"."sales_events" to "service_role";

grant truncate on table "public"."sales_events" to "service_role";

grant update on table "public"."sales_events" to "service_role";

grant delete on table "public"."store_products" to "anon";

grant insert on table "public"."store_products" to "anon";

grant references on table "public"."store_products" to "anon";

grant select on table "public"."store_products" to "anon";

grant trigger on table "public"."store_products" to "anon";

grant truncate on table "public"."store_products" to "anon";

grant update on table "public"."store_products" to "anon";

grant delete on table "public"."store_products" to "authenticated";

grant insert on table "public"."store_products" to "authenticated";

grant references on table "public"."store_products" to "authenticated";

grant select on table "public"."store_products" to "authenticated";

grant trigger on table "public"."store_products" to "authenticated";

grant truncate on table "public"."store_products" to "authenticated";

grant update on table "public"."store_products" to "authenticated";

grant delete on table "public"."store_products" to "service_role";

grant insert on table "public"."store_products" to "service_role";

grant references on table "public"."store_products" to "service_role";

grant select on table "public"."store_products" to "service_role";

grant trigger on table "public"."store_products" to "service_role";

grant truncate on table "public"."store_products" to "service_role";

grant update on table "public"."store_products" to "service_role";

grant delete on table "public"."store_settings" to "anon";

grant insert on table "public"."store_settings" to "anon";

grant references on table "public"."store_settings" to "anon";

grant select on table "public"."store_settings" to "anon";

grant trigger on table "public"."store_settings" to "anon";

grant truncate on table "public"."store_settings" to "anon";

grant update on table "public"."store_settings" to "anon";

grant delete on table "public"."store_settings" to "authenticated";

grant insert on table "public"."store_settings" to "authenticated";

grant references on table "public"."store_settings" to "authenticated";

grant select on table "public"."store_settings" to "authenticated";

grant trigger on table "public"."store_settings" to "authenticated";

grant truncate on table "public"."store_settings" to "authenticated";

grant update on table "public"."store_settings" to "authenticated";

grant delete on table "public"."store_settings" to "service_role";

grant insert on table "public"."store_settings" to "service_role";

grant references on table "public"."store_settings" to "service_role";

grant select on table "public"."store_settings" to "service_role";

grant trigger on table "public"."store_settings" to "service_role";

grant truncate on table "public"."store_settings" to "service_role";

grant update on table "public"."store_settings" to "service_role";

grant delete on table "public"."store_users" to "anon";

grant insert on table "public"."store_users" to "anon";

grant references on table "public"."store_users" to "anon";

grant select on table "public"."store_users" to "anon";

grant trigger on table "public"."store_users" to "anon";

grant truncate on table "public"."store_users" to "anon";

grant update on table "public"."store_users" to "anon";

grant delete on table "public"."store_users" to "authenticated";

grant insert on table "public"."store_users" to "authenticated";

grant references on table "public"."store_users" to "authenticated";

grant select on table "public"."store_users" to "authenticated";

grant trigger on table "public"."store_users" to "authenticated";

grant truncate on table "public"."store_users" to "authenticated";

grant update on table "public"."store_users" to "authenticated";

grant delete on table "public"."store_users" to "service_role";

grant insert on table "public"."store_users" to "service_role";

grant references on table "public"."store_users" to "service_role";

grant select on table "public"."store_users" to "service_role";

grant trigger on table "public"."store_users" to "service_role";

grant truncate on table "public"."store_users" to "service_role";

grant update on table "public"."store_users" to "service_role";

grant delete on table "public"."stores" to "anon";

grant insert on table "public"."stores" to "anon";

grant references on table "public"."stores" to "anon";

grant select on table "public"."stores" to "anon";

grant trigger on table "public"."stores" to "anon";

grant truncate on table "public"."stores" to "anon";

grant update on table "public"."stores" to "anon";

grant delete on table "public"."stores" to "authenticated";

grant insert on table "public"."stores" to "authenticated";

grant references on table "public"."stores" to "authenticated";

grant select on table "public"."stores" to "authenticated";

grant trigger on table "public"."stores" to "authenticated";

grant truncate on table "public"."stores" to "authenticated";

grant update on table "public"."stores" to "authenticated";

grant delete on table "public"."stores" to "service_role";

grant insert on table "public"."stores" to "service_role";

grant references on table "public"."stores" to "service_role";

grant select on table "public"."stores" to "service_role";

grant trigger on table "public"."stores" to "service_role";

grant truncate on table "public"."stores" to "service_role";

grant update on table "public"."stores" to "service_role";

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "batch_actions_store_access"
  on "public"."batch_actions"
  as permissive
  for all
  to authenticated
using (public.rls_check_store_access((store_id)::uuid));



  create policy "batches_store_access"
  on "public"."batches"
  as permissive
  for all
  to authenticated
using (public.rls_check_store_access((store_id)::uuid));



  create policy "categories_read_all"
  on "public"."categories"
  as permissive
  for select
  to public
using (true);



  create policy "category_weights_read_all"
  on "public"."category_weights"
  as permissive
  for select
  to public
using (true);



  create policy "donation_recipients_store_access"
  on "public"."donation_recipients"
  as permissive
  for all
  to authenticated
using (public.rls_check_store_access((store_id)::uuid));



  create policy "external_factors_store_access"
  on "public"."external_factors"
  as permissive
  for all
  to authenticated
using (((store_id IS NULL) OR public.rls_check_store_access((store_id)::uuid)));



  create policy "inventory_snapshots_store_access"
  on "public"."inventory_snapshots"
  as permissive
  for all
  to authenticated
using (((store_id IS NULL) OR public.rls_check_store_access((store_id)::uuid)));



  create policy "product_scores_store_access"
  on "public"."product_scores"
  as permissive
  for all
  to authenticated
using (((store_id IS NULL) OR public.rls_check_store_access((store_id)::uuid)));



  create policy "products_insert_authenticated"
  on "public"."products"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() IS NOT NULL));



  create policy "products_read_authenticated"
  on "public"."products"
  as permissive
  for select
  to authenticated
using (true);



  create policy "products_update_authenticated"
  on "public"."products"
  as permissive
  for update
  to authenticated
using ((((created_by)::text = ((auth.uid())::character varying)::text) OR (auth.uid() IS NOT NULL)));



  create policy "roles_read_authenticated"
  on "public"."roles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "sales_events_store_access"
  on "public"."sales_events"
  as permissive
  for all
  to authenticated
using (((store_id IS NULL) OR public.rls_check_store_access((store_id)::uuid)));



  create policy "store_products_store_access"
  on "public"."store_products"
  as permissive
  for all
  to authenticated
using (public.rls_check_store_access((store_id)::uuid));



  create policy "store_settings_store_access"
  on "public"."store_settings"
  as permissive
  for all
  to authenticated
using (public.rls_check_store_access((store_id)::uuid));



  create policy "store_users_delete_owner"
  on "public"."store_users"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (store_users.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "store_users_manage_owner"
  on "public"."store_users"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (store_users.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "store_users_read_member"
  on "public"."store_users"
  as permissive
  for select
  to authenticated
using ((((user_id)::text = ((auth.uid())::character varying)::text) OR public.rls_check_store_access((store_id)::uuid)));



  create policy "store_users_update_owner"
  on "public"."store_users"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (store_users.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "stores_read_member"
  on "public"."stores"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (stores.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND (su.is_active = true)))));



  create policy "stores_update_owner"
  on "public"."stores"
  as permissive
  for update
  to authenticated
using ((((owner_id)::text = ((auth.uid())::character varying)::text) OR (EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (stores.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))));



  create policy "user_roles_read_own"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using (((user_id)::text = ((auth.uid())::character varying)::text));



  create policy "users_read_own"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (((id)::text = ((auth.uid())::character varying)::text));



  create policy "users_update_own"
  on "public"."users"
  as permissive
  for update
  to authenticated
using (((id)::text = ((auth.uid())::character varying)::text));



  create policy "Store owners and managers can insert store settings"
  on "business"."store_settings"
  as permissive
  for insert
  to public
with check ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su.is_active = true)))));



  create policy "Store owners and managers can update store settings"
  on "business"."store_settings"
  as permissive
  for update
  to public
using ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su.is_active = true)))));



  create policy "Store owners and managers can view store settings"
  on "business"."store_settings"
  as permissive
  for select
  to public
using ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su.is_active = true)))));



  create policy "Users can manage settings for their stores"
  on "business"."store_settings"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM business.store_users su
  WHERE ((su.store_id = store_settings.store_id) AND (su.user_id = ( SELECT auth.uid() AS uid)) AND (su.is_active = true) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))))
with check ((EXISTS ( SELECT 1
   FROM business.store_users su
  WHERE ((su.store_id = store_settings.store_id) AND (su.user_id = ( SELECT auth.uid() AS uid)) AND (su.is_active = true) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "batch_action_entries_delete_policy"
  on "inventory"."batch_actions"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (inventory.batches b
     JOIN business.store_users su ON ((su.store_id = b.store_id)))
  WHERE ((b.batch_id = batch_actions.batch_id) AND (su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su.is_active = true)))));



  create policy "Users can view batch status logs"
  on "inventory"."batch_status_logs"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "batches_delete_policy"
  on "inventory"."batches"
  as permissive
  for delete
  to public
using ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND (su.is_active = true) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



  create policy "batches_update_policy"
  on "inventory"."batches"
  as permissive
  for update
  to public
using ((store_id IN ( SELECT su.store_id
   FROM business.store_users su
  WHERE ((su.user_id = ( SELECT auth.uid() AS uid)) AND (su.is_active = true) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'staff'::character varying])::text[]))))));



  create policy "Store managers can remove products from stores"
  on "inventory"."store_products"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.store_id = store_products.store_id) AND (store_users.user_id = ( SELECT auth.uid() AS uid)) AND ((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (store_users.is_active = true)))));



  create policy "Only privileged users can delete transactions"
  on "sales"."transactions"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.store_id = transactions.store_id) AND (store_users.user_id = ( SELECT auth.uid() AS uid)) AND ((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (store_users.is_active = true)))));



  create policy "Authorized users can insert sales events"
  on "timeseries"."sales_events"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.user_id = auth.uid()) AND (store_users.store_id = sales_events.store_id) AND (store_users.is_active = true) AND (((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) OR (((store_users.permissions ->> 'can_scan_out'::text))::boolean = true))))));



  create policy "Store managers can assign roles"
  on "user_mgmt"."user_roles"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (business.store_users su1
     JOIN business.store_users su2 ON ((su1.store_id = su2.store_id)))
  WHERE ((su1.user_id = ( SELECT auth.uid() AS uid)) AND (su2.user_id = user_roles.user_id) AND ((su1.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su1.is_active = true)))));



  create policy "Store managers can update user roles"
  on "user_mgmt"."user_roles"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (business.store_users su1
     JOIN business.store_users su2 ON ((su1.store_id = su2.store_id)))
  WHERE ((su1.user_id = ( SELECT auth.uid() AS uid)) AND (su2.user_id = user_roles.user_id) AND ((su1.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su1.is_active = true)))));



  create policy "Store managers can create employee accounts"
  on "user_mgmt"."users"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM business.store_users
  WHERE ((store_users.user_id = ( SELECT auth.uid() AS uid)) AND ((store_users.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (store_users.is_active = true)))));



  create policy "Store managers can update employee profiles"
  on "user_mgmt"."users"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (business.store_users su1
     JOIN business.store_users su2 ON ((su1.store_id = su2.store_id)))
  WHERE ((su1.user_id = ( SELECT auth.uid() AS uid)) AND (su2.user_id = users.user_id) AND ((su1.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su1.is_active = true)))));



  create policy "Store managers can view employee profiles"
  on "user_mgmt"."users"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (business.store_users su1
     JOIN business.store_users su2 ON ((su1.store_id = su2.store_id)))
  WHERE ((su1.user_id = ( SELECT auth.uid() AS uid)) AND (su2.user_id = users.user_id) AND ((su1.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])) AND (su1.is_active = true)))));


CREATE TRIGGER "store-scoring-setup" AFTER INSERT ON business.stores FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://lifo-ai-api-staging-i2o78.ondigitalocean.app/api/v1/webhooks/supabase/store-created', 'POST', '{"Content-type":"application/json","apikey":"sb_secret_YTaH6ijzniGW8dVpqT8_mw_YaxVKbLP"}', '{}', '5000');

CREATE TRIGGER "store-welcome-email" AFTER INSERT ON business.stores FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://lifo-app.com/api/webhooks/store-created-welcome', 'POST', '{"Content-type":"application/json","Authorization:":"Bearer 26d2329529014a05f2d626cf7ecd262c0b356a83656bdd6197583937a3c5a237"}', '{}', '5000');

CREATE TRIGGER trigger_batches_updated_at BEFORE UPDATE ON inventory.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_categories_updated_at BEFORE UPDATE ON inventory.categories FOR EACH ROW EXECUTE FUNCTION public.update_categories_updated_at();

CREATE TRIGGER trigger_update_cache_updated_at BEFORE UPDATE ON inventory.product_recognition_cache FOR EACH ROW EXECUTE FUNCTION public.update_cache_updated_at();

CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON inventory.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


  create policy "Service role can manage refresh tokens"
  on "auth"."refresh_tokens"
  as permissive
  for all
  to public
using (((current_setting('role'::text, true) = 'service_role'::text) OR (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text)));



  create policy "Users can view own refresh tokens"
  on "auth"."refresh_tokens"
  as permissive
  for select
  to public
using (((user_id)::text = (auth.uid())::text));



  create policy "Service role can manage sessions"
  on "auth"."sessions"
  as permissive
  for all
  to public
using (((current_setting('role'::text, true) = 'service_role'::text) OR (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text)));



  create policy "Users can view own sessions"
  on "auth"."sessions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Service role can manage all users"
  on "auth"."users"
  as permissive
  for all
  to public
using (((current_setting('role'::text, true) = 'service_role'::text) OR (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text)));



  create policy "Users can update own profile"
  on "auth"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "auth"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));


CREATE TRIGGER ensure_user_preferences_trigger AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION user_mgmt.ensure_user_preferences();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_create_preferences AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences_on_signup();

CREATE TRIGGER set_french_default_trigger BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.set_default_french_language();


