drop policy "batch_actions_store_access" on "public"."batch_actions";

drop policy "batches_store_access" on "public"."batches";

drop policy "categories_read_all" on "public"."categories";

drop policy "category_weights_read_all" on "public"."category_weights";

drop policy "donation_recipients_store_access" on "public"."donation_recipients";

drop policy "external_factors_store_access" on "public"."external_factors";

drop policy "inventory_snapshots_store_access" on "public"."inventory_snapshots";

drop policy "product_scores_store_access" on "public"."product_scores";

drop policy "products_insert_authenticated" on "public"."products";

drop policy "products_read_authenticated" on "public"."products";

drop policy "products_update_authenticated" on "public"."products";

drop policy "roles_read_authenticated" on "public"."roles";

drop policy "stores_read_member" on "public"."stores";

drop policy "stores_update_owner" on "public"."stores";

drop policy "user_roles_read_own" on "public"."user_roles";

drop policy "users_read_own" on "public"."users";

drop policy "users_update_own" on "public"."users";

drop policy "Store owners and managers can insert store settings" on "business"."store_settings";

drop policy "Store owners and managers can update store settings" on "business"."store_settings";

drop policy "Store owners and managers can view store settings" on "business"."store_settings";

drop policy "Users can manage settings for their stores" on "business"."store_settings";

drop policy "batch_action_entries_delete_policy" on "inventory"."batch_actions";

drop policy "Users can view batch status logs" on "inventory"."batch_status_logs";

drop policy "batches_delete_policy" on "inventory"."batches";

drop policy "batches_update_policy" on "inventory"."batches";

drop policy "Store managers can remove products from stores" on "inventory"."store_products";

drop policy "store_users_delete_owner" on "public"."store_users";

drop policy "store_users_manage_owner" on "public"."store_users";

drop policy "store_users_update_owner" on "public"."store_users";

drop policy "Only privileged users can delete transactions" on "sales"."transactions";

drop policy "Authorized users can insert sales events" on "timeseries"."sales_events";

drop policy "Store managers can assign roles" on "user_mgmt"."user_roles";

drop policy "Store managers can update user roles" on "user_mgmt"."user_roles";

drop policy "Store managers can create employee accounts" on "user_mgmt"."users";

drop policy "Store managers can update employee profiles" on "user_mgmt"."users";

drop policy "Store managers can view employee profiles" on "user_mgmt"."users";

revoke delete on table "public"."batch_actions" from "anon";

revoke insert on table "public"."batch_actions" from "anon";

revoke references on table "public"."batch_actions" from "anon";

revoke select on table "public"."batch_actions" from "anon";

revoke trigger on table "public"."batch_actions" from "anon";

revoke truncate on table "public"."batch_actions" from "anon";

revoke update on table "public"."batch_actions" from "anon";

revoke delete on table "public"."batch_actions" from "authenticated";

revoke insert on table "public"."batch_actions" from "authenticated";

revoke references on table "public"."batch_actions" from "authenticated";

revoke select on table "public"."batch_actions" from "authenticated";

revoke trigger on table "public"."batch_actions" from "authenticated";

revoke truncate on table "public"."batch_actions" from "authenticated";

revoke update on table "public"."batch_actions" from "authenticated";

revoke delete on table "public"."batch_actions" from "service_role";

revoke insert on table "public"."batch_actions" from "service_role";

revoke references on table "public"."batch_actions" from "service_role";

revoke select on table "public"."batch_actions" from "service_role";

revoke trigger on table "public"."batch_actions" from "service_role";

revoke truncate on table "public"."batch_actions" from "service_role";

revoke update on table "public"."batch_actions" from "service_role";

revoke delete on table "public"."batches" from "anon";

revoke insert on table "public"."batches" from "anon";

revoke references on table "public"."batches" from "anon";

revoke select on table "public"."batches" from "anon";

revoke trigger on table "public"."batches" from "anon";

revoke truncate on table "public"."batches" from "anon";

revoke update on table "public"."batches" from "anon";

revoke delete on table "public"."batches" from "authenticated";

revoke insert on table "public"."batches" from "authenticated";

revoke references on table "public"."batches" from "authenticated";

revoke select on table "public"."batches" from "authenticated";

revoke trigger on table "public"."batches" from "authenticated";

revoke truncate on table "public"."batches" from "authenticated";

revoke update on table "public"."batches" from "authenticated";

revoke delete on table "public"."batches" from "service_role";

revoke insert on table "public"."batches" from "service_role";

revoke references on table "public"."batches" from "service_role";

revoke select on table "public"."batches" from "service_role";

revoke trigger on table "public"."batches" from "service_role";

revoke truncate on table "public"."batches" from "service_role";

revoke update on table "public"."batches" from "service_role";

revoke delete on table "public"."categories" from "anon";

revoke insert on table "public"."categories" from "anon";

revoke references on table "public"."categories" from "anon";

revoke select on table "public"."categories" from "anon";

revoke trigger on table "public"."categories" from "anon";

revoke truncate on table "public"."categories" from "anon";

revoke update on table "public"."categories" from "anon";

revoke delete on table "public"."categories" from "authenticated";

revoke insert on table "public"."categories" from "authenticated";

revoke references on table "public"."categories" from "authenticated";

revoke select on table "public"."categories" from "authenticated";

revoke trigger on table "public"."categories" from "authenticated";

revoke truncate on table "public"."categories" from "authenticated";

revoke update on table "public"."categories" from "authenticated";

revoke delete on table "public"."categories" from "service_role";

revoke insert on table "public"."categories" from "service_role";

revoke references on table "public"."categories" from "service_role";

revoke select on table "public"."categories" from "service_role";

revoke trigger on table "public"."categories" from "service_role";

revoke truncate on table "public"."categories" from "service_role";

revoke update on table "public"."categories" from "service_role";

revoke delete on table "public"."category_weights" from "anon";

revoke insert on table "public"."category_weights" from "anon";

revoke references on table "public"."category_weights" from "anon";

revoke select on table "public"."category_weights" from "anon";

revoke trigger on table "public"."category_weights" from "anon";

revoke truncate on table "public"."category_weights" from "anon";

revoke update on table "public"."category_weights" from "anon";

revoke delete on table "public"."category_weights" from "authenticated";

revoke insert on table "public"."category_weights" from "authenticated";

revoke references on table "public"."category_weights" from "authenticated";

revoke select on table "public"."category_weights" from "authenticated";

revoke trigger on table "public"."category_weights" from "authenticated";

revoke truncate on table "public"."category_weights" from "authenticated";

revoke update on table "public"."category_weights" from "authenticated";

revoke delete on table "public"."category_weights" from "service_role";

revoke insert on table "public"."category_weights" from "service_role";

revoke references on table "public"."category_weights" from "service_role";

revoke select on table "public"."category_weights" from "service_role";

revoke trigger on table "public"."category_weights" from "service_role";

revoke truncate on table "public"."category_weights" from "service_role";

revoke update on table "public"."category_weights" from "service_role";

revoke delete on table "public"."donation_recipients" from "anon";

revoke insert on table "public"."donation_recipients" from "anon";

revoke references on table "public"."donation_recipients" from "anon";

revoke select on table "public"."donation_recipients" from "anon";

revoke trigger on table "public"."donation_recipients" from "anon";

revoke truncate on table "public"."donation_recipients" from "anon";

revoke update on table "public"."donation_recipients" from "anon";

revoke delete on table "public"."donation_recipients" from "authenticated";

revoke insert on table "public"."donation_recipients" from "authenticated";

revoke references on table "public"."donation_recipients" from "authenticated";

revoke select on table "public"."donation_recipients" from "authenticated";

revoke trigger on table "public"."donation_recipients" from "authenticated";

revoke truncate on table "public"."donation_recipients" from "authenticated";

revoke update on table "public"."donation_recipients" from "authenticated";

revoke delete on table "public"."donation_recipients" from "service_role";

revoke insert on table "public"."donation_recipients" from "service_role";

revoke references on table "public"."donation_recipients" from "service_role";

revoke select on table "public"."donation_recipients" from "service_role";

revoke trigger on table "public"."donation_recipients" from "service_role";

revoke truncate on table "public"."donation_recipients" from "service_role";

revoke update on table "public"."donation_recipients" from "service_role";

revoke delete on table "public"."external_factors" from "anon";

revoke insert on table "public"."external_factors" from "anon";

revoke references on table "public"."external_factors" from "anon";

revoke select on table "public"."external_factors" from "anon";

revoke trigger on table "public"."external_factors" from "anon";

revoke truncate on table "public"."external_factors" from "anon";

revoke update on table "public"."external_factors" from "anon";

revoke delete on table "public"."external_factors" from "authenticated";

revoke insert on table "public"."external_factors" from "authenticated";

revoke references on table "public"."external_factors" from "authenticated";

revoke select on table "public"."external_factors" from "authenticated";

revoke trigger on table "public"."external_factors" from "authenticated";

revoke truncate on table "public"."external_factors" from "authenticated";

revoke update on table "public"."external_factors" from "authenticated";

revoke delete on table "public"."external_factors" from "service_role";

revoke insert on table "public"."external_factors" from "service_role";

revoke references on table "public"."external_factors" from "service_role";

revoke select on table "public"."external_factors" from "service_role";

revoke trigger on table "public"."external_factors" from "service_role";

revoke truncate on table "public"."external_factors" from "service_role";

revoke update on table "public"."external_factors" from "service_role";

revoke delete on table "public"."inventory_snapshots" from "anon";

revoke insert on table "public"."inventory_snapshots" from "anon";

revoke references on table "public"."inventory_snapshots" from "anon";

revoke select on table "public"."inventory_snapshots" from "anon";

revoke trigger on table "public"."inventory_snapshots" from "anon";

revoke truncate on table "public"."inventory_snapshots" from "anon";

revoke update on table "public"."inventory_snapshots" from "anon";

revoke delete on table "public"."inventory_snapshots" from "authenticated";

revoke insert on table "public"."inventory_snapshots" from "authenticated";

revoke references on table "public"."inventory_snapshots" from "authenticated";

revoke select on table "public"."inventory_snapshots" from "authenticated";

revoke trigger on table "public"."inventory_snapshots" from "authenticated";

revoke truncate on table "public"."inventory_snapshots" from "authenticated";

revoke update on table "public"."inventory_snapshots" from "authenticated";

revoke delete on table "public"."inventory_snapshots" from "service_role";

revoke insert on table "public"."inventory_snapshots" from "service_role";

revoke references on table "public"."inventory_snapshots" from "service_role";

revoke select on table "public"."inventory_snapshots" from "service_role";

revoke trigger on table "public"."inventory_snapshots" from "service_role";

revoke truncate on table "public"."inventory_snapshots" from "service_role";

revoke update on table "public"."inventory_snapshots" from "service_role";

revoke delete on table "public"."product_scores" from "anon";

revoke insert on table "public"."product_scores" from "anon";

revoke references on table "public"."product_scores" from "anon";

revoke select on table "public"."product_scores" from "anon";

revoke trigger on table "public"."product_scores" from "anon";

revoke truncate on table "public"."product_scores" from "anon";

revoke update on table "public"."product_scores" from "anon";

revoke delete on table "public"."product_scores" from "authenticated";

revoke insert on table "public"."product_scores" from "authenticated";

revoke references on table "public"."product_scores" from "authenticated";

revoke select on table "public"."product_scores" from "authenticated";

revoke trigger on table "public"."product_scores" from "authenticated";

revoke truncate on table "public"."product_scores" from "authenticated";

revoke update on table "public"."product_scores" from "authenticated";

revoke delete on table "public"."product_scores" from "service_role";

revoke insert on table "public"."product_scores" from "service_role";

revoke references on table "public"."product_scores" from "service_role";

revoke select on table "public"."product_scores" from "service_role";

revoke trigger on table "public"."product_scores" from "service_role";

revoke truncate on table "public"."product_scores" from "service_role";

revoke update on table "public"."product_scores" from "service_role";

revoke delete on table "public"."products" from "anon";

revoke insert on table "public"."products" from "anon";

revoke references on table "public"."products" from "anon";

revoke select on table "public"."products" from "anon";

revoke trigger on table "public"."products" from "anon";

revoke truncate on table "public"."products" from "anon";

revoke update on table "public"."products" from "anon";

revoke delete on table "public"."products" from "authenticated";

revoke insert on table "public"."products" from "authenticated";

revoke references on table "public"."products" from "authenticated";

revoke select on table "public"."products" from "authenticated";

revoke trigger on table "public"."products" from "authenticated";

revoke truncate on table "public"."products" from "authenticated";

revoke update on table "public"."products" from "authenticated";

revoke delete on table "public"."products" from "service_role";

revoke insert on table "public"."products" from "service_role";

revoke references on table "public"."products" from "service_role";

revoke select on table "public"."products" from "service_role";

revoke trigger on table "public"."products" from "service_role";

revoke truncate on table "public"."products" from "service_role";

revoke update on table "public"."products" from "service_role";

revoke delete on table "public"."roles" from "anon";

revoke insert on table "public"."roles" from "anon";

revoke references on table "public"."roles" from "anon";

revoke select on table "public"."roles" from "anon";

revoke trigger on table "public"."roles" from "anon";

revoke truncate on table "public"."roles" from "anon";

revoke update on table "public"."roles" from "anon";

revoke delete on table "public"."roles" from "authenticated";

revoke insert on table "public"."roles" from "authenticated";

revoke references on table "public"."roles" from "authenticated";

revoke select on table "public"."roles" from "authenticated";

revoke trigger on table "public"."roles" from "authenticated";

revoke truncate on table "public"."roles" from "authenticated";

revoke update on table "public"."roles" from "authenticated";

revoke delete on table "public"."roles" from "service_role";

revoke insert on table "public"."roles" from "service_role";

revoke references on table "public"."roles" from "service_role";

revoke select on table "public"."roles" from "service_role";

revoke trigger on table "public"."roles" from "service_role";

revoke truncate on table "public"."roles" from "service_role";

revoke update on table "public"."roles" from "service_role";

revoke delete on table "public"."stores" from "anon";

revoke insert on table "public"."stores" from "anon";

revoke references on table "public"."stores" from "anon";

revoke select on table "public"."stores" from "anon";

revoke trigger on table "public"."stores" from "anon";

revoke truncate on table "public"."stores" from "anon";

revoke update on table "public"."stores" from "anon";

revoke delete on table "public"."stores" from "authenticated";

revoke insert on table "public"."stores" from "authenticated";

revoke references on table "public"."stores" from "authenticated";

revoke select on table "public"."stores" from "authenticated";

revoke trigger on table "public"."stores" from "authenticated";

revoke truncate on table "public"."stores" from "authenticated";

revoke update on table "public"."stores" from "authenticated";

revoke delete on table "public"."stores" from "service_role";

revoke insert on table "public"."stores" from "service_role";

revoke references on table "public"."stores" from "service_role";

revoke select on table "public"."stores" from "service_role";

revoke trigger on table "public"."stores" from "service_role";

revoke truncate on table "public"."stores" from "service_role";

revoke update on table "public"."stores" from "service_role";

revoke delete on table "public"."user_roles" from "anon";

revoke insert on table "public"."user_roles" from "anon";

revoke references on table "public"."user_roles" from "anon";

revoke select on table "public"."user_roles" from "anon";

revoke trigger on table "public"."user_roles" from "anon";

revoke truncate on table "public"."user_roles" from "anon";

revoke update on table "public"."user_roles" from "anon";

revoke delete on table "public"."user_roles" from "authenticated";

revoke insert on table "public"."user_roles" from "authenticated";

revoke references on table "public"."user_roles" from "authenticated";

revoke select on table "public"."user_roles" from "authenticated";

revoke trigger on table "public"."user_roles" from "authenticated";

revoke truncate on table "public"."user_roles" from "authenticated";

revoke update on table "public"."user_roles" from "authenticated";

revoke delete on table "public"."user_roles" from "service_role";

revoke insert on table "public"."user_roles" from "service_role";

revoke references on table "public"."user_roles" from "service_role";

revoke select on table "public"."user_roles" from "service_role";

revoke trigger on table "public"."user_roles" from "service_role";

revoke truncate on table "public"."user_roles" from "service_role";

revoke update on table "public"."user_roles" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

alter table "public"."batch_actions" drop constraint "batch_actions_batch_id_fkey";

alter table "public"."batch_actions" drop constraint "batch_actions_donation_recipient_id_fkey";

alter table "public"."batch_actions" drop constraint "batch_actions_performed_by_fkey";

alter table "public"."batch_actions" drop constraint "batch_actions_store_id_fkey";

alter table "public"."batch_actions" drop constraint "batch_actions_verified_by_fkey";

alter table "public"."batches" drop constraint "batches_created_by_fkey";

alter table "public"."batches" drop constraint "batches_product_id_fkey";

alter table "public"."batches" drop constraint "batches_store_id_fkey";

alter table "public"."categories" drop constraint "categories_category_code_key";

alter table "public"."categories" drop constraint "categories_parent_category_id_fkey";

alter table "public"."category_weights" drop constraint "chk_spoilage_weight";

alter table "public"."category_weights" drop constraint "chk_turnover_weight";

alter table "public"."category_weights" drop constraint "chk_value_weight";

alter table "public"."category_weights" drop constraint "chk_weights_sum";

alter table "public"."donation_recipients" drop constraint "donation_recipients_created_by_fkey";

alter table "public"."donation_recipients" drop constraint "donation_recipients_store_id_fkey";

alter table "public"."external_factors" drop constraint "external_factors_store_id_fkey";

alter table "public"."inventory_snapshots" drop constraint "inventory_snapshots_batch_id_fkey";

alter table "public"."inventory_snapshots" drop constraint "inventory_snapshots_store_id_fkey";

alter table "public"."product_scores" drop constraint "chk_composite_score";

alter table "public"."product_scores" drop constraint "chk_confidence_level";

alter table "public"."product_scores" drop constraint "chk_expiry_score";

alter table "public"."product_scores" drop constraint "chk_margin_score";

alter table "public"."product_scores" drop constraint "chk_recommendation";

alter table "public"."product_scores" drop constraint "chk_velocity_score";

alter table "public"."product_scores" drop constraint "product_scores_batch_id_fkey";

alter table "public"."product_scores" drop constraint "product_scores_store_id_fkey";

alter table "public"."product_scores" drop constraint "uq_batch_score";

alter table "public"."products" drop constraint "products_barcode_key";

alter table "public"."products" drop constraint "products_category_id_fkey";

alter table "public"."products" drop constraint "products_created_by_fkey";

alter table "public"."products" drop constraint "products_sku_key";

alter table "public"."roles" drop constraint "roles_name_key";

alter table "public"."sales_events" drop constraint "sales_events_batch_id_fkey";

alter table "public"."sales_events" drop constraint "sales_events_store_id_fkey";

alter table "public"."store_products" drop constraint "store_products_added_by_fkey";

alter table "public"."store_products" drop constraint "store_products_product_id_fkey";

alter table "public"."store_products" drop constraint "store_products_store_id_fkey";

alter table "public"."store_products" drop constraint "store_products_updated_by_fkey";

alter table "public"."store_settings" drop constraint "store_settings_store_id_fkey";

alter table "public"."store_users" drop constraint "store_users_store_id_fkey";

alter table "public"."stores" drop constraint "stores_store_code_key";

alter table "public"."user_roles" drop constraint "user_roles_role_id_fkey";

alter table "public"."user_roles" drop constraint "user_roles_user_id_fkey";

alter table "public"."users" drop constraint "users_email_key";

alter table "business"."store_users" drop constraint "chk_pin_access_level";

alter table "business"."store_users" drop constraint "store_users_role_in_store_check";

alter table "business"."stores" drop constraint "stores_size_category_check";

alter table "inventory"."batches" drop constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" drop constraint "ocr_processing_batches_processing_status_check";

drop view if exists "inventory"."automation_preview";

drop view if exists "inventory"."batch_expiry_status";

drop view if exists "inventory"."batch_todo_states";

drop view if exists "inventory"."expiring_products";

drop view if exists "inventory"."my_store_products";

drop view if exists "inventory"."products_needing_barcodes";

drop view if exists "inventory"."products_with_categories";

drop view if exists "public"."inventory_view_for_scoring";

alter table "public"."batch_actions" drop constraint "batch_actions_pkey";

alter table "public"."batches" drop constraint "batches_pkey";

alter table "public"."categories" drop constraint "categories_pkey";

alter table "public"."category_weights" drop constraint "category_weights_pkey";

alter table "public"."donation_recipients" drop constraint "donation_recipients_pkey";

alter table "public"."external_factors" drop constraint "external_factors_pkey";

alter table "public"."inventory_snapshots" drop constraint "inventory_snapshots_pkey";

alter table "public"."product_scores" drop constraint "product_scores_pkey";

alter table "public"."products" drop constraint "products_pkey";

alter table "public"."roles" drop constraint "roles_pkey";

alter table "public"."stores" drop constraint "stores_pkey";

alter table "public"."user_roles" drop constraint "user_roles_pkey";

alter table "public"."users" drop constraint "users_pkey";

drop index if exists "public"."batch_actions_pkey";

drop index if exists "public"."batches_pkey";

drop index if exists "public"."categories_category_code_key";

drop index if exists "public"."categories_pkey";

drop index if exists "public"."category_weights_pkey";

drop index if exists "public"."donation_recipients_pkey";

drop index if exists "public"."external_factors_pkey";

drop index if exists "public"."inventory_snapshots_pkey";

drop index if exists "public"."product_scores_pkey";

drop index if exists "public"."products_barcode_key";

drop index if exists "public"."products_pkey";

drop index if exists "public"."products_sku_key";

drop index if exists "public"."roles_name_key";

drop index if exists "public"."roles_pkey";

drop index if exists "public"."stores_pkey";

drop index if exists "public"."stores_store_code_key";

drop index if exists "public"."uq_batch_score";

drop index if exists "public"."user_roles_pkey";

drop index if exists "public"."users_email_key";

drop index if exists "public"."users_pkey";

drop index if exists "scoring"."idx_product_scores_recommendations";

drop table "public"."batch_actions";

drop table "public"."batches";

drop table "public"."categories";

drop table "public"."category_weights";

drop table "public"."donation_recipients";

drop table "public"."external_factors";

drop table "public"."inventory_snapshots";

drop table "public"."product_scores";

drop table "public"."products";

drop table "public"."roles";

drop table "public"."stores";

drop table "public"."user_roles";

drop table "public"."users";

CREATE INDEX idx_product_scores_recommendations ON scoring.product_scores USING btree (store_id, recommendation, calculated_at DESC) INCLUDE (batch_id, composite_score, urgency_level, discount_percent) WHERE ((recommendation)::text = ANY ((ARRAY['discount_aggressive'::character varying, 'discount_moderate'::character varying, 'alert'::character varying])::text[]));

alter table "business"."store_users" add constraint "chk_pin_access_level" CHECK (((pin_access_level)::text = ANY ((ARRAY['basic'::character varying, 'elevated'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "chk_pin_access_level";

alter table "business"."store_users" add constraint "store_users_role_in_store_check" CHECK (((role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'employee'::character varying, 'staff'::character varying])::text[]))) not valid;

alter table "business"."store_users" validate constraint "store_users_role_in_store_check";

alter table "business"."stores" add constraint "stores_size_category_check" CHECK (((size_category)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'hypermarket'::character varying])::text[]))) not valid;

alter table "business"."stores" validate constraint "stores_size_category_check";

alter table "inventory"."batches" add constraint "batches_verification_check" CHECK (((verification_status)::text = ANY ((ARRAY['verified'::character varying, 'pending'::character varying, 'flagged'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "inventory"."batches" validate constraint "batches_verification_check";

alter table "inventory"."ocr_processing_batches" add constraint "ocr_processing_batches_processing_status_check" CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))) not valid;

alter table "inventory"."ocr_processing_batches" validate constraint "ocr_processing_batches_processing_status_check";

set check_function_bodies = off;

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
            batch_actions.discount_percentage AS action_discount_percent
           FROM inventory.batch_actions
          WHERE ((batch_actions.action_type IS NOT NULL) AND (batch_actions.performed_by IS NOT NULL) AND (batch_actions.quantity_affected > (0)::numeric))
          ORDER BY batch_actions.batch_id, batch_actions.performed_at DESC
        ), last_discount AS (
         SELECT DISTINCT ON (batch_actions.batch_id) batch_actions.batch_id,
            batch_actions.discount_percentage,
            batch_actions.performed_at AS discount_applied_at
           FROM inventory.batch_actions
          WHERE ((batch_actions.action_type = 'discount'::public.action_type) AND (batch_actions.discount_percentage IS NOT NULL))
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
    ld.discount_percentage AS last_discount_percent,
    COALESCE(acs.total_actions, (0)::bigint) AS total_actions_ever,
    COALESCE(acs.total_discounted, (0)::numeric) AS total_discounted_quantity,
    COALESCE(acs.total_donated, (0)::numeric) AS total_donated_quantity,
    COALESCE(acs.total_disposed, (0)::numeric) AS total_disposed_quantity,
    COALESCE(acs.total_sold, (0)::numeric) AS total_sold_quantity,
    COALESCE(acs.total_ignored, (0)::numeric) AS total_ignored_quantity,
    b.cost_price,
    b.selling_price,
        CASE
            WHEN (ld.discount_percentage IS NOT NULL) THEN (b.selling_price * ((1)::numeric - (ld.discount_percentage / (100)::numeric)))
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
            WHEN (ld.discount_percentage IS NOT NULL) THEN (b.selling_price * ((1)::numeric - (ld.discount_percentage / (100)::numeric)))
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
   FROM (((((inventory.batches b
     LEFT JOIN inventory.products p ON ((b.product_id = p.product_id)))
     LEFT JOIN scoring.product_scores ps ON ((b.batch_id = ps.batch_id)))
     LEFT JOIN all_actions aa ON ((b.batch_id = aa.batch_id)))
     LEFT JOIN last_discount ld ON ((b.batch_id = ld.batch_id)))
     LEFT JOIN action_summary acs ON ((b.batch_id = acs.batch_id)));


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
  v_last_discount_percent DECIMAL;  -- NEW: Track discount percentage
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

  -- NEW: Look up the most recent discount percentage for this batch
  SELECT discount_percentage INTO v_last_discount_percent
  FROM inventory.batch_actions
  WHERE batch_id = p_batch_id
    AND action_type = 'discount'
    AND discount_percentage IS NOT NULL
  ORDER BY performed_at DESC
  LIMIT 1;

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
    discount_percentage,  -- NEW: Carry forward the discount
    total_original_value, disposal_reason,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'dispose'::public.action_type,
    v_valid_recommended_action,
    p_quantity_disposed,
    v_last_discount_percent,  -- NEW: Include discount from previous discount action
    v_original_value, p_disposal_reason,
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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW()
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
    'waste_value', v_original_value,
    'discount_applied', v_last_discount_percent  -- NEW: Return discount info
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
  v_last_discount_percent DECIMAL;  -- NEW: Track discount percentage
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

  -- NEW: Look up the most recent discount percentage for this batch
  SELECT discount_percentage INTO v_last_discount_percent
  FROM inventory.batch_actions
  WHERE batch_id = p_batch_id
    AND action_type = 'discount'
    AND discount_percentage IS NOT NULL
  ORDER BY performed_at DESC
  LIMIT 1;

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
    discount_percentage,  -- NEW: Carry forward the discount
    total_original_value, donation_recipient_id,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'donate'::public.action_type,
    v_valid_recommended_action,
    p_quantity_affected,
    v_last_discount_percent,  -- NEW: Include discount from previous discount action
    v_original_value, p_donation_recipient_id,
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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW()
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
    'original_value', v_original_value,
    'discount_applied', v_last_discount_percent  -- NEW: Return discount info
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
  v_last_discount_percent DECIMAL;  -- NEW: Track discount percentage
  v_effective_price DECIMAL;         -- NEW: Price after discount
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

  -- NEW: Look up the most recent discount percentage for this batch
  SELECT discount_percentage INTO v_last_discount_percent
  FROM inventory.batch_actions
  WHERE batch_id = p_batch_id
    AND action_type = 'discount'
    AND discount_percentage IS NOT NULL
  ORDER BY performed_at DESC
  LIMIT 1;

  -- Calculate effective price (with discount if applicable)
  IF v_last_discount_percent IS NOT NULL THEN
    v_effective_price := v_batch.selling_price * (1 - v_last_discount_percent / 100);
  ELSE
    v_effective_price := v_batch.selling_price;
  END IF;

  -- Calculate revenue based on effective (discounted) price
  v_revenue_recovered := p_quantity_sold * v_effective_price;

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

  -- Record the action with AI recommendation AND discount percentage preserved
  INSERT INTO inventory.batch_actions (
    batch_id, store_id, action_type, recommended_action, quantity_affected,
    discount_percentage,  -- NEW: Carry forward the discount
    total_original_value, total_recovered_value,
    performed_by, batch_initial_quantity, notes
  ) VALUES (
    p_batch_id, v_batch.store_id, 'sold'::public.action_type,
    v_valid_recommended_action,
    p_quantity_sold,
    v_last_discount_percent,  -- NEW: Include discount from previous discount action
    p_quantity_sold * v_batch.selling_price,  -- Original value (full price)
    v_revenue_recovered,  -- Recovered value (after discount)
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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'scoring' AND table_name = 'product_scores') THEN
    UPDATE scoring.product_scores
    SET status = 'completed',
        completed_at = NOW()
    WHERE batch_id = p_batch_id;
  END IF;

  -- Track for analytics (if exists) - also include discounted price
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'analytics' AND table_name = 'actions') THEN
    INSERT INTO analytics.actions (
      batch_id, store_id, action_type,
      original_price, new_price, executed_by
    ) VALUES (
      p_batch_id, v_batch.store_id, 'sold',
      v_batch.selling_price, v_effective_price, p_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', v_entry_id,
    'remaining_quantity', v_new_quantity,
    'revenue_recovered', v_revenue_recovered,
    'discount_applied', v_last_discount_percent,  -- NEW: Return discount info
    'effective_price', v_effective_price          -- NEW: Return effective price
  );
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



  create policy "store_users_update_owner"
  on "public"."store_users"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.store_users su
  WHERE (((su.store_id)::text = (store_users.store_id)::text) AND ((su.user_id)::text = ((auth.uid())::character varying)::text) AND ((su.role_in_store)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));



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



