export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  analytics: {
    Tables: {
      actions: {
        Row: {
          action_id: string
          action_type: string | null
          batch_id: string | null
          discount_percent: number | null
          effectiveness_score: number | null
          executed_at: string | null
          executed_by: string | null
          new_price: number | null
          original_price: number | null
          quantity_sold_24h: number | null
          quantity_sold_48h: number | null
          revenue_recovered: number | null
          store_id: string | null
        }
        Insert: {
          action_id?: string
          action_type?: string | null
          batch_id?: string | null
          discount_percent?: number | null
          effectiveness_score?: number | null
          executed_at?: string | null
          executed_by?: string | null
          new_price?: number | null
          original_price?: number | null
          quantity_sold_24h?: number | null
          quantity_sold_48h?: number | null
          revenue_recovered?: number | null
          store_id?: string | null
        }
        Update: {
          action_id?: string
          action_type?: string | null
          batch_id?: string | null
          discount_percent?: number | null
          effectiveness_score?: number | null
          executed_at?: string | null
          executed_by?: string | null
          new_price?: number | null
          original_price?: number | null
          quantity_sold_24h?: number | null
          quantity_sold_48h?: number | null
          revenue_recovered?: number | null
          store_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      daily_inventory_summary: {
        Row: {
          avg_days_to_expiry: number | null
          avg_quantity: number | null
          max_quantity: number | null
          min_quantity: number | null
          sku: string | null
          snapshot_count: number | null
          snapshot_date: string | null
          store_id: string | null
        }
        Relationships: []
      }
      daily_sales_summary: {
        Row: {
          avg_sale_price: number | null
          sale_date: string | null
          sku: string | null
          store_id: string | null
          total_quantity_sold: number | null
          total_revenue: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  business: {
    Tables: {
      store_settings: {
        Row: {
          backup_preferences: Json | null
          critical_threshold: number | null
          currency: string | null
          display_preferences: Json | null
          donation_preference_config: Json | null
          notification_preferences: Json | null
          opening_hours: Json | null
          peak_hours: Json | null
          scoring_weights: Json | null
          store_id: string
          updated_at: string | null
          warning_threshold: number | null
          weather_location_lat: number | null
          weather_location_lon: number | null
        }
        Insert: {
          backup_preferences?: Json | null
          critical_threshold?: number | null
          currency?: string | null
          display_preferences?: Json | null
          donation_preference_config?: Json | null
          notification_preferences?: Json | null
          opening_hours?: Json | null
          peak_hours?: Json | null
          scoring_weights?: Json | null
          store_id: string
          updated_at?: string | null
          warning_threshold?: number | null
          weather_location_lat?: number | null
          weather_location_lon?: number | null
        }
        Update: {
          backup_preferences?: Json | null
          critical_threshold?: number | null
          currency?: string | null
          display_preferences?: Json | null
          donation_preference_config?: Json | null
          notification_preferences?: Json | null
          opening_hours?: Json | null
          peak_hours?: Json | null
          scoring_weights?: Json | null
          store_id?: string
          updated_at?: string | null
          warning_threshold?: number | null
          weather_location_lat?: number | null
          weather_location_lon?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
      store_users: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          can_use_pin_auth: boolean | null
          created_at: string | null
          is_active: boolean | null
          permissions: Json | null
          pin_access_level: string | null
          pin_permissions: Json | null
          role_in_store: string | null
          store_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_use_pin_auth?: boolean | null
          created_at?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          pin_access_level?: string | null
          pin_permissions?: Json | null
          role_in_store?: string | null
          store_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_use_pin_auth?: boolean | null
          created_at?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          pin_access_level?: string | null
          pin_permissions?: Json | null
          role_in_store?: string | null
          store_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          default_markup_percent: number | null
          description: string | null
          email: string | null
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          onboarding_completed: boolean | null
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          size_category: string | null
          store_code: string
          store_id: string
          store_name: string
          store_type: Database["business"]["Enums"]["store_type_enum"] | null
          timezone: string | null
          updated_at: string | null
          waste_reduction_target_percent: number | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          default_markup_percent?: number | null
          description?: string | null
          email?: string | null
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          size_category?: string | null
          store_code: string
          store_id?: string
          store_name: string
          store_type?: Database["business"]["Enums"]["store_type_enum"] | null
          timezone?: string | null
          updated_at?: string | null
          waste_reduction_target_percent?: number | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          default_markup_percent?: number | null
          description?: string | null
          email?: string | null
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          size_category?: string | null
          store_code?: string
          store_id?: string
          store_name?: string
          store_type?: Database["business"]["Enums"]["store_type_enum"] | null
          timezone?: string | null
          updated_at?: string | null
          waste_reduction_target_percent?: number | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      store_type_reference: {
        Row: {
          store_type_value:
            | Database["business"]["Enums"]["store_type_enum"]
            | null
        }
        Relationships: []
      }
      user_store_permissions: {
        Row: {
          assigned_at: string | null
          can_use_pin_auth: boolean | null
          effective_role: string | null
          is_active: boolean | null
          is_store_owner: boolean | null
          owner_id: string | null
          permissions: Json | null
          pin_access_level: string | null
          role_in_store: string | null
          store_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
    }
    Functions: {
      create_store_for_user: {
        Args: {
          p_address?: string
          p_business_name?: string
          p_city?: string
          p_country?: string
          p_phone?: string
          p_postal_code?: string
          p_size_category?: string
          p_store_code: string
          p_store_name: string
          p_store_type?: string
          p_timezone?: string
        }
        Returns: {
          address: string | null
          business_name: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          default_markup_percent: number | null
          description: string | null
          email: string | null
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          onboarding_completed: boolean | null
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          size_category: string | null
          store_code: string
          store_id: string
          store_name: string
          store_type: Database["business"]["Enums"]["store_type_enum"] | null
          timezone: string | null
          updated_at: string | null
          waste_reduction_target_percent: number | null
          website_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_store_safe: { Args: { p_store_id: string }; Returns: Json }
      delete_store_and_data: {
        Args: {
          deletion_reason?: string
          performed_by_user_id?: string
          target_store_id: string
        }
        Returns: Json
      }
      get_store_types: {
        Args: never
        Returns: Database["business"]["Enums"]["store_type_enum"][]
      }
      get_user_accessible_store_ids: {
        Args: { check_user_id?: string }
        Returns: {
          store_id: string
        }[]
      }
      get_user_stores_fast: {
        Args: { check_user_id?: string }
        Returns: string[]
      }
      update_store_user_safe: {
        Args: {
          input_can_use_pin_auth?: boolean
          input_is_active?: boolean
          input_permissions?: Json
          input_pin_access_level?: string
          input_pin_permissions?: Json
          input_role_in_store?: string
          input_store_id: string
          input_user_id: string
        }
        Returns: {
          assigned_at: string
          assigned_by: string
          can_use_pin_auth: boolean
          created_at: string
          email: string
          is_active: boolean
          permissions: Json
          pin_access_level: string
          pin_permissions: Json
          raw_user_meta_data: Json
          role_in_store: string
          store_id: string
          updated_at: string
          user_id: string
        }[]
      }
      user_can_manage_store_users: {
        Args: { target_store_id: string; target_user_id?: string }
        Returns: boolean
      }
      user_can_manage_store_users_v2: {
        Args: { target_store_id: string; target_user_id?: string }
        Returns: boolean
      }
      user_has_store_access: { Args: { store_uuid: string }; Returns: boolean }
    }
    Enums: {
      store_type_enum:
        | "supermarket"
        | "convenience"
        | "restaurant"
        | "bakery"
        | "butcher"
        | "organic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  inventory: {
    Tables: {
      batch_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["action_type"] | null
          ai_score: number | null
          batch_id: string
          batch_initial_quantity: number | null
          created_at: string
          discount_percentage: number | null
          disposal_reason: string | null
          donation_recipient_id: string | null
          entry_id: string
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          quantity_affected: number | null
          recommended_action: Database["public"]["Enums"]["action_type"] | null
          store_id: string | null
          total_original_value: number | null
          total_recovered_value: number | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action_type?: Database["public"]["Enums"]["action_type"] | null
          ai_score?: number | null
          batch_id: string
          batch_initial_quantity?: number | null
          created_at?: string
          discount_percentage?: number | null
          disposal_reason?: string | null
          donation_recipient_id?: string | null
          entry_id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          quantity_affected?: number | null
          recommended_action?: Database["public"]["Enums"]["action_type"] | null
          store_id?: string | null
          total_original_value?: number | null
          total_recovered_value?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["action_type"] | null
          ai_score?: number | null
          batch_id?: string
          batch_initial_quantity?: number | null
          created_at?: string
          discount_percentage?: number | null
          disposal_reason?: string | null
          donation_recipient_id?: string | null
          entry_id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          quantity_affected?: number | null
          recommended_action?: Database["public"]["Enums"]["action_type"] | null
          store_id?: string | null
          total_original_value?: number | null
          total_recovered_value?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_actions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "automation_preview"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_actions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_expiry_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_actions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_actions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_todo_states"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_actions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batch_actions_donation_recipient_id_fkey"
            columns: ["donation_recipient_id"]
            isOneToOne: false
            referencedRelation: "donation_recipients"
            referencedColumns: ["recipient_id"]
          },
        ]
      }
      batch_status_logs: {
        Row: {
          action_type: string
          affected_count: number | null
          created_by: string | null
          executed_at: string | null
          log_id: string
          notes: string | null
        }
        Insert: {
          action_type: string
          affected_count?: number | null
          created_by?: string | null
          executed_at?: string | null
          log_id?: string
          notes?: string | null
        }
        Update: {
          action_type?: string
          affected_count?: number | null
          created_by?: string | null
          executed_at?: string | null
          log_id?: string
          notes?: string | null
        }
        Relationships: []
      }
      batches: {
        Row: {
          available_quantity: number | null
          batch_id: string
          batch_number: string
          batch_source: string | null
          cost_price: number
          created_at: string | null
          created_by: string | null
          current_quantity: number
          expiry_date: string
          initial_quantity: number
          location_code: string | null
          manufacture_date: string | null
          ocr_confidence: number | null
          ocr_extracted_date: string | null
          processing_batch_id: string | null
          product_id: string
          received_date: string | null
          reserved_quantity: number | null
          scan_confidence: number | null
          scanned_barcode: string | null
          selling_price: number
          status: string | null
          store_id: string
          supplier: string | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          available_quantity?: number | null
          batch_id?: string
          batch_number: string
          batch_source?: string | null
          cost_price: number
          created_at?: string | null
          created_by?: string | null
          current_quantity: number
          expiry_date: string
          initial_quantity: number
          location_code?: string | null
          manufacture_date?: string | null
          ocr_confidence?: number | null
          ocr_extracted_date?: string | null
          processing_batch_id?: string | null
          product_id: string
          received_date?: string | null
          reserved_quantity?: number | null
          scan_confidence?: number | null
          scanned_barcode?: string | null
          selling_price: number
          status?: string | null
          store_id: string
          supplier?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          available_quantity?: number | null
          batch_id?: string
          batch_number?: string
          batch_source?: string | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number
          expiry_date?: string
          initial_quantity?: number
          location_code?: string | null
          manufacture_date?: string | null
          ocr_confidence?: number | null
          ocr_extracted_date?: string | null
          processing_batch_id?: string | null
          product_id?: string
          received_date?: string | null
          reserved_quantity?: number | null
          scan_confidence?: number | null
          scanned_barcode?: string | null
          selling_price?: number
          status?: string | null
          store_id?: string
          supplier?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_processing_batch_id_fkey"
            columns: ["processing_batch_id"]
            isOneToOne: false
            referencedRelation: "ocr_processing_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "batches_store_product_fkey"
            columns: ["store_id", "product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["store_id", "product_id"]
          },
        ]
      }
      categories: {
        Row: {
          category_code: string
          category_id: string
          created_at: string | null
          display_name_en: string
          display_name_fr: string | null
          is_active: boolean | null
          parent_category_id: string | null
          sort_order: number | null
          typical_shelf_life_days: number | null
          updated_at: string | null
        }
        Insert: {
          category_code: string
          category_id?: string
          created_at?: string | null
          display_name_en: string
          display_name_fr?: string | null
          is_active?: boolean | null
          parent_category_id?: string | null
          sort_order?: number | null
          typical_shelf_life_days?: number | null
          updated_at?: string | null
        }
        Update: {
          category_code?: string
          category_id?: string
          created_at?: string | null
          display_name_en?: string
          display_name_fr?: string | null
          is_active?: boolean | null
          parent_category_id?: string | null
          sort_order?: number | null
          typical_shelf_life_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      donation_recipients: {
        Row: {
          accepts_pickups: boolean | null
          certification_notes: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          is_active: boolean | null
          is_certified: boolean | null
          max_distance_km: number | null
          name: string
          recipient_id: string
          recipient_type: Database["public"]["Enums"]["donation_recipient_type"]
          store_id: string
        }
        Insert: {
          accepts_pickups?: boolean | null
          certification_notes?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          is_active?: boolean | null
          is_certified?: boolean | null
          max_distance_km?: number | null
          name: string
          recipient_id?: string
          recipient_type: Database["public"]["Enums"]["donation_recipient_type"]
          store_id: string
        }
        Update: {
          accepts_pickups?: boolean | null
          certification_notes?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          is_active?: boolean | null
          is_certified?: boolean | null
          max_distance_km?: number | null
          name?: string
          recipient_id?: string
          recipient_type?: Database["public"]["Enums"]["donation_recipient_type"]
          store_id?: string
        }
        Relationships: []
      }
      ocr_processing_batches: {
        Row: {
          batch_id: string
          completed_at: string | null
          error_details: Json | null
          image_count: number
          processing_status: string | null
          store_id: string | null
          submitted_at: string | null
          success_count: number | null
          total_cost_cents: number | null
        }
        Insert: {
          batch_id?: string
          completed_at?: string | null
          error_details?: Json | null
          image_count: number
          processing_status?: string | null
          store_id?: string | null
          submitted_at?: string | null
          success_count?: number | null
          total_cost_cents?: number | null
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          error_details?: Json | null
          image_count?: number
          processing_status?: string | null
          store_id?: string | null
          submitted_at?: string | null
          success_count?: number | null
          total_cost_cents?: number | null
        }
        Relationships: []
      }
      product_recognition_cache: {
        Row: {
          barcode: string
          brand: string | null
          cache_id: string
          category: string | null
          created_at: string | null
          image_url: string | null
          is_verified: boolean | null
          last_verified: string | null
          open_food_facts_data: Json | null
          product_name: string
          typical_shelf_life_days: number | null
          updated_at: string | null
          verification_count: number | null
        }
        Insert: {
          barcode: string
          brand?: string | null
          cache_id?: string
          category?: string | null
          created_at?: string | null
          image_url?: string | null
          is_verified?: boolean | null
          last_verified?: string | null
          open_food_facts_data?: Json | null
          product_name: string
          typical_shelf_life_days?: number | null
          updated_at?: string | null
          verification_count?: number | null
        }
        Update: {
          barcode?: string
          brand?: string | null
          cache_id?: string
          category?: string | null
          created_at?: string | null
          image_url?: string | null
          is_verified?: boolean | null
          last_verified?: string | null
          open_food_facts_data?: Json | null
          product_name?: string
          typical_shelf_life_days?: number | null
          updated_at?: string | null
          verification_count?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active_batches_count: number | null
          avg_days_to_expiry: number | null
          barcode: string | null
          barcode_type: string | null
          base_cost_price: number
          base_selling_price: number
          brand: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          image_url: string | null
          is_verified: boolean | null
          last_scanned_at: string | null
          last_verified: string | null
          name: string
          open_food_facts_data: Json | null
          product_id: string
          sku: string
          total_stock: number | null
          typical_shelf_life_days: number
          unit_type: string
          updated_at: string | null
          verification_count: number | null
        }
        Insert: {
          active_batches_count?: number | null
          avg_days_to_expiry?: number | null
          barcode?: string | null
          barcode_type?: string | null
          base_cost_price: number
          base_selling_price: number
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          image_url?: string | null
          is_verified?: boolean | null
          last_scanned_at?: string | null
          last_verified?: string | null
          name: string
          open_food_facts_data?: Json | null
          product_id?: string
          sku: string
          total_stock?: number | null
          typical_shelf_life_days: number
          unit_type: string
          updated_at?: string | null
          verification_count?: number | null
        }
        Update: {
          active_batches_count?: number | null
          avg_days_to_expiry?: number | null
          barcode?: string | null
          barcode_type?: string | null
          base_cost_price?: number
          base_selling_price?: number
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          image_url?: string | null
          is_verified?: boolean | null
          last_scanned_at?: string | null
          last_verified?: string | null
          name?: string
          open_food_facts_data?: Json | null
          product_id?: string
          sku?: string
          total_stock?: number | null
          typical_shelf_life_days?: number
          unit_type?: string
          updated_at?: string | null
          verification_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      store_products: {
        Row: {
          added_by: string | null
          cost_price: number | null
          created_at: string | null
          is_active: boolean | null
          product_id: string
          selling_price: number | null
          store_id: string
          store_sku: string | null
          supplier_code: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          added_by?: string | null
          cost_price?: number | null
          created_at?: string | null
          is_active?: boolean | null
          product_id: string
          selling_price?: number | null
          store_id: string
          store_sku?: string | null
          supplier_code?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          added_by?: string | null
          cost_price?: number | null
          created_at?: string | null
          is_active?: boolean | null
          product_id?: string
          selling_price?: number | null
          store_id?: string
          store_sku?: string | null
          supplier_code?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "expiring_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "my_store_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_needing_barcodes"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_categories"
            referencedColumns: ["product_id"]
          },
        ]
      }
    }
    Views: {
      automation_preview: {
        Row: {
          batch_id: string | null
          brand: string | null
          current_quantity: number | null
          current_status: string | null
          days_past_expiry: number | null
          expiry_date: string | null
          potential_loss_value: number | null
          product_name: string | null
          store_name: string | null
          would_become_status: string | null
        }
        Relationships: []
      }
      barcode_scan_summary: {
        Row: {
          avg_confidence: number | null
          batch_count: number | null
          batch_source: string | null
          first_scan: string | null
          last_scan: string | null
          store_id: string | null
          unique_barcodes: number | null
          verification_status: string | null
        }
        Relationships: []
      }
      batch_expiry_status: {
        Row: {
          batch_id: string | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          current_quantity: number | null
          days_to_expiry: number | null
          expiry_date: string | null
          product_id: string | null
          product_name: string | null
          status: string | null
          store_id: string | null
          urgency_level: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_store_product_fkey"
            columns: ["store_id", "product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["store_id", "product_id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      batch_status: {
        Row: {
          available_quantity: number | null
          batch_id: string | null
          batch_number: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          current_quantity: number | null
          days_to_expiry: number | null
          expiry_date: string | null
          expiry_status: string | null
          initial_quantity: number | null
          is_expired: boolean | null
          location_code: string | null
          manufacture_date: string | null
          product_id: string | null
          received_date: string | null
          reserved_quantity: number | null
          selling_price: number | null
          status: string | null
          supplier: string | null
          turnover_days: number | null
          updated_at: string | null
        }
        Insert: {
          available_quantity?: number | null
          batch_id?: string | null
          batch_number?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number | null
          days_to_expiry?: never
          expiry_date?: string | null
          expiry_status?: never
          initial_quantity?: number | null
          is_expired?: never
          location_code?: string | null
          manufacture_date?: string | null
          product_id?: string | null
          received_date?: string | null
          reserved_quantity?: number | null
          selling_price?: number | null
          status?: string | null
          supplier?: string | null
          turnover_days?: never
          updated_at?: string | null
        }
        Update: {
          available_quantity?: number | null
          batch_id?: string | null
          batch_number?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number | null
          days_to_expiry?: never
          expiry_date?: string | null
          expiry_status?: never
          initial_quantity?: number | null
          is_expired?: never
          location_code?: string | null
          manufacture_date?: string | null
          product_id?: string | null
          received_date?: string | null
          reserved_quantity?: number | null
          selling_price?: number | null
          status?: string | null
          supplier?: string | null
          turnover_days?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      batch_todo_states: {
        Row: {
          ai_calculated_at: string | null
          ai_recommendation: string | null
          available_quantity: number | null
          batch_id: string | null
          batch_number: string | null
          batch_status: string | null
          completion_status: string | null
          composite_score: number | null
          cost_price: number | null
          current_quantity: number | null
          current_selling_price: number | null
          current_total_value: number | null
          days_to_expiry: number | null
          expiry_date: string | null
          hours_since_last_action: number | null
          last_action_quantity: number | null
          last_action_time: string | null
          last_action_type: Database["public"]["Enums"]["action_type"] | null
          last_discount_percent: number | null
          potential_loss_value: number | null
          potential_revenue_value: number | null
          priority_order: number | null
          product_brand: string | null
          product_name: string | null
          profit_margin: number | null
          profit_margin_percent: number | null
          selling_price: number | null
          store_id: string | null
          todo_state: string | null
          total_actions_ever: number | null
          total_discounted_quantity: number | null
          total_disposed_quantity: number | null
          total_donated_quantity: number | null
          total_ignored_quantity: number | null
          total_sold_quantity: number | null
          unit_price: number | null
          urgency_level: string | null
          view_refreshed_at: string | null
        }
        Relationships: []
      }
      expiring_products: {
        Row: {
          active_batches_count: number | null
          avg_days_to_expiry: number | null
          barcode: string | null
          barcode_type: string | null
          base_cost_price: number | null
          base_selling_price: number | null
          brand: string | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          created_by: string | null
          current_quantity: number | null
          days_to_expiry: number | null
          description: string | null
          expiry_date: string | null
          image_url: string | null
          is_verified: boolean | null
          last_scanned_at: string | null
          last_verified: string | null
          name: string | null
          open_food_facts_data: Json | null
          product_id: string | null
          sku: string | null
          total_stock: number | null
          typical_shelf_life_days: number | null
          unit_type: string | null
          updated_at: string | null
          verification_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      my_store_products: {
        Row: {
          active_batches_count: number | null
          avg_days_to_expiry: number | null
          barcode: string | null
          barcode_type: string | null
          base_cost_price: number | null
          base_selling_price: number | null
          brand: string | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          image_url: string | null
          is_verified: boolean | null
          last_scanned_at: string | null
          last_verified: string | null
          name: string | null
          open_food_facts_data: Json | null
          product_id: string | null
          sku: string | null
          store_cost_price: number | null
          store_is_active: boolean | null
          store_selling_price: number | null
          store_sku: string | null
          supplier_code: string | null
          total_stock: number | null
          typical_shelf_life_days: number | null
          unit_type: string | null
          updated_at: string | null
          verification_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      products_needing_barcodes: {
        Row: {
          active_batches_count: number | null
          avg_days_to_expiry: number | null
          barcode: string | null
          barcode_type: string | null
          base_cost_price: number | null
          base_selling_price: number | null
          brand: string | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          image_url: string | null
          is_verified: boolean | null
          last_scanned_at: string | null
          last_verified: string | null
          name: string | null
          open_food_facts_data: Json | null
          product_id: string | null
          sku: string | null
          total_stock: number | null
          typical_shelf_life_days: number | null
          unit_type: string | null
          updated_at: string | null
          verification_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      products_with_categories: {
        Row: {
          active_batches_count: number | null
          avg_days_to_expiry: number | null
          barcode: string | null
          barcode_type: string | null
          base_cost_price: number | null
          base_selling_price: number | null
          brand: string | null
          category_code: string | null
          category_display_name_en: string | null
          category_display_name_fr: string | null
          category_id: string | null
          category_shelf_life: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_shelf_life: number | null
          image_url: string | null
          is_verified: boolean | null
          last_scanned_at: string | null
          last_verified: string | null
          name: string | null
          open_food_facts_data: Json | null
          product_id: string | null
          sku: string | null
          total_stock: number | null
          typical_shelf_life_days: number | null
          unit_type: string | null
          updated_at: string | null
          verification_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      sales_summary: {
        Row: {
          batch_id: string | null
          channel: string | null
          customer_type: string | null
          event_id: string | null
          quantity_sold: number | null
          sale_price: number | null
          sale_timestamp: string | null
          sale_value: number | null
          sku: string | null
          store_id: string | null
        }
        Insert: {
          batch_id?: string | null
          channel?: string | null
          customer_type?: string | null
          event_id?: string | null
          quantity_sold?: number | null
          sale_price?: number | null
          sale_timestamp?: string | null
          sale_value?: never
          sku?: string | null
          store_id?: string | null
        }
        Update: {
          batch_id?: string | null
          channel?: string | null
          customer_type?: string | null
          event_id?: string | null
          quantity_sold?: number | null
          sale_price?: number | null
          sale_timestamp?: string | null
          sale_value?: never
          sku?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "automation_preview"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "sales_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_expiry_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "sales_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "sales_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_todo_states"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "sales_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["batch_id"]
          },
        ]
      }
    }
    Functions: {
      auto_expire_batches: { Args: never; Returns: number }
      batch_update_quantities: { Args: { items: Json }; Returns: Json }
      calculate_batch_score_manual: {
        Args: { batch_row: Database["inventory"]["Tables"]["batches"]["Row"] }
        Returns: undefined
      }
      daily_batch_expiry_cleanup: { Args: never; Returns: undefined }
      get_action_statistics: {
        Args: { p_end_date?: string; p_start_date?: string; p_store_id: string }
        Returns: {
          action_type: Database["public"]["Enums"]["action_type"]
          avg_recovery_rate: number
          most_common_day_of_week: string
          total_actions: number
          total_original_value: number
          total_quantity: number
          total_recovered_value: number
        }[]
      }
      get_available_batches_by_product: {
        Args: { p_product_id: string; p_store_id: string }
        Returns: {
          available_quantity: number
          barcode: string
          batch_id: string
          batch_number: string
          brand_name: string
          category_name: string
          cost_price: number
          created_at: string
          current_quantity: number
          expiry_date: string
          location_code: string
          product_id: string
          product_name: string
          selling_price: number
          status: string
          store_id: string
        }[]
      }
      get_batch_action_breakdown: {
        Args: { p_batch_id: string }
        Returns: {
          action_type: Database["public"]["Enums"]["action_type"]
          batch_id: string
          batch_number: string
          current_quantity: number
          discount_percentage: number
          disposal_reason: string
          donation_recipient_name: string
          initial_quantity: number
          notes: string
          original_value: number
          percentage_of_batch: number
          performed_at: string
          performed_by_name: string
          product_name: string
          quantity_affected: number
          recovered_value: number
          verified_at: string
        }[]
      }
      get_batches_paginated: {
        Args: {
          p_expiring_in_days?: number
          p_expiry_date_from?: string
          p_expiry_date_to?: string
          p_has_stock?: boolean
          p_location_code?: string
          p_page?: number
          p_page_size?: number
          p_product_id?: string
          p_received_date_from?: string
          p_received_date_to?: string
          p_sort_direction?: string
          p_sort_field?: string
          p_status?: string
          p_store_id: string
          p_supplier?: string
        }
        Returns: {
          available_quantity: number
          batch_id: string
          batch_number: string
          batch_source: string
          cost_price: number
          created_at: string
          created_by: string
          current_quantity: number
          expiry_date: string
          initial_quantity: number
          location_code: string
          manufacture_date: string
          ocr_confidence: number
          ocr_extracted_date: string
          product_barcode: string
          product_brand: string
          product_category_code: string
          product_category_id: string
          product_category_name_en: string
          product_category_name_fr: string
          product_description: string
          product_id: string
          product_image_url: string
          product_name: string
          product_sku: string
          product_typical_shelf_life_days: number
          product_unit_type: string
          received_date: string
          reserved_quantity: number
          scan_confidence: number
          scanned_barcode: string
          selling_price: number
          status: string
          store_id: string
          supplier: string
          total_count: number
          updated_at: string
          verification_status: string
        }[]
      }
      get_categories_for_dropdown: {
        Args: never
        Returns: {
          category_code: string
          category_id: string
          display_name_en: string
          display_name_fr: string
          product_count: number
        }[]
      }
      get_category_info: {
        Args: { category_text?: string; category_uuid?: string }
        Returns: {
          category_code: string
          category_id: string
          display_name_en: string
          display_name_fr: string
          typical_shelf_life_days: number
        }[]
      }
      get_donation_recipients: {
        Args: { p_store_id: string }
        Returns: {
          accepts_pickups: boolean
          contact_email: string
          contact_phone: string
          is_certified: boolean
          max_distance_km: number
          name: string
          recipient_id: string
          recipient_type: Database["public"]["Enums"]["donation_recipient_type"]
        }[]
      }
      get_expiring_batches: {
        Args: { p_days_ahead?: number; p_store_id: string }
        Returns: {
          available_quantity: number
          batch_id: string
          batch_number: string
          cost_price: number
          current_quantity: number
          days_until_expiry: number
          expiry_date: string
          location_code: string
          product_barcode: string
          product_brand: string
          product_category_code: string
          product_category_name_en: string
          product_category_name_fr: string
          product_id: string
          product_name: string
          product_sku: string
          selling_price: number
          status: string
          store_id: string
          supplier: string
          total_value: number
        }[]
      }
      get_expiry_job_status: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_low_stock_batches: {
        Args: { p_store_id: string; p_threshold_quantity?: number }
        Returns: {
          available_quantity: number
          batch_id: string
          batch_number: string
          current_quantity: number
          expiry_date: string
          product_category_code: string
          product_category_name_en: string
          product_id: string
          product_name: string
          product_sku: string
          status: string
        }[]
      }
      get_products_paginated: {
        Args: {
          p_brand?: string
          p_category_code?: string
          p_page_offset?: number
          p_page_size?: number
          p_sort_direction?: string
          p_sort_field?: string
          p_store_id: string
        }
        Returns: {
          active_batches_count: number
          avg_days_to_expiry: number
          barcode: string
          barcode_type: string
          base_cost_price: number
          base_selling_price: number
          brand: string
          calculated_active_batches_count: number
          calculated_total_stock: number
          category_code: string
          category_display_name: string
          category_display_name_fr: string
          category_id: string
          created_at: string
          created_by: string
          description: string
          image_url: string
          is_verified: boolean
          last_scanned_at: string
          last_verified: string
          name: string
          open_food_facts_data: Json
          product_id: string
          sku: string
          store_cost_price: number
          store_is_active: boolean
          store_selling_price: number
          store_sku: string
          supplier_code: string
          total_count: number
          total_stock: number
          typical_shelf_life_days: number
          unit_type: string
          updated_at: string
          verification_count: number
        }[]
      }
      get_recent_actions: {
        Args: { p_limit?: number; p_store_id: string }
        Returns: {
          action_type: Database["public"]["Enums"]["action_type"]
          batch_number: string
          entry_id: string
          notes: string
          original_value: number
          performed_at: string
          performed_by_email: string
          product_name: string
          quantity_affected: number
          recovered_value: number
        }[]
      }
      get_urgent_todos_count: { Args: { p_store_id: string }; Returns: number }
      get_user_stores: {
        Args: never
        Returns: {
          role_in_store: string
          store_id: string
          store_name: string
        }[]
      }
      has_batches: { Args: { p_store_id: string }; Returns: boolean }
      manual_expire_batch: { Args: { batch_uuid: string }; Returns: boolean }
      map_legacy_category: {
        Args: { legacy_category: string }
        Returns: string
      }
      record_batch_actions: {
        Args: { p_actions: Json; p_batch_id: string }
        Returns: Json
      }
      resolve_category_from_off_data: {
        Args: { off_categories: string[] }
        Returns: string
      }
      trigger_manual_expiry_cleanup: { Args: never; Returns: Json }
      user_can_access_store: { Args: { store_uuid: string }; Returns: boolean }
      user_can_manage_store: { Args: { store_uuid: string }; Returns: boolean }
      validate_batch_actions: {
        Args: { p_actions: Json; p_batch_id: string }
        Returns: {
          available_quantity: number
          error_message: string
          is_valid: boolean
          requested_quantity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      temp_batch_actions_staging: {
        Row: {
          ai_score: number | null
          batch_id: string
          notes: string | null
          recommended_action: string | null
          store_id: string
        }
        Insert: {
          ai_score?: number | null
          batch_id: string
          notes?: string | null
          recommended_action?: string | null
          store_id: string
        }
        Update: {
          ai_score?: number | null
          batch_id?: string
          notes?: string | null
          recommended_action?: string | null
          store_id?: string
        }
        Relationships: []
      }
      temp_scores_staging: {
        Row: {
          batch_id: string
          calculated_at: string
          composite_score: number
          confidence_level: number | null
          discount_percent: number | null
          expiry_score: number
          margin_score: number
          ml_enhanced: boolean | null
          reason: string | null
          recommendation: string
          store_id: string
          urgency_level: string
          velocity_score: number
        }
        Insert: {
          batch_id: string
          calculated_at: string
          composite_score: number
          confidence_level?: number | null
          discount_percent?: number | null
          expiry_score: number
          margin_score: number
          ml_enhanced?: boolean | null
          reason?: string | null
          recommendation: string
          store_id: string
          urgency_level: string
          velocity_score: number
        }
        Update: {
          batch_id?: string
          calculated_at?: string
          composite_score?: number
          confidence_level?: number | null
          discount_percent?: number | null
          expiry_score?: number
          margin_score?: number
          ml_enhanced?: boolean | null
          reason?: string | null
          recommendation?: string
          store_id?: string
          urgency_level?: string
          velocity_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      inventory_view_for_scoring: {
        Row: {
          batch_id: string | null
          category: string | null
          category_code: string | null
          cost_price: number | null
          current_quantity: number | null
          days_to_expiry: number | null
          expiry_date: string | null
          product_id: string | null
          selling_price: number | null
          sku: string | null
          store_id: string | null
          typical_shelf_life_days: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_existing_user_to_store: {
        Args: {
          input_role?: string
          input_store_id: string
          input_user_email: string
        }
        Returns: {
          message: string
          success: boolean
          user_id: string
        }[]
      }
      add_product_to_store_safely: {
        Args: {
          p_cost_price?: number
          p_product_id: string
          p_selling_price?: number
          p_store_id: string
          p_store_sku?: string
        }
        Returns: string
      }
      admin_add_test_user: {
        Args: {
          input_email: string
          input_full_name: string
          input_role?: string
          input_store_id: string
        }
        Returns: {
          message: string
          success: boolean
          user_id: string
        }[]
      }
      audit_function_security: {
        Args: never
        Returns: {
          arguments: string
          function_name: string
          has_search_path: boolean
          is_security_definer: boolean
          schema_name: string
          security_status: string
        }[]
      }
      batch_update_quantities: {
        Args: { p_items: Json; p_store_id: string }
        Returns: Json
      }
      bulk_csv_import: {
        Args: { p_csv_data: Json; p_store_id: string; p_user_id: string }
        Returns: {
          batch_ids_result: string[]
          error_messages: string[]
          processed_count: number
          product_ids_result: string[]
        }[]
      }
      bulk_insert_csv_batches: {
        Args: { p_created_by: string; p_data: Json; p_store_id: string }
        Returns: {
          batch_ids: string[]
          inserted_count: number
          processing_time_ms: number
        }[]
      }
      bulk_insert_csv_batches_with_store_link: {
        Args: { p_created_by: string; p_data: Json; p_store_id: string }
        Returns: {
          batch_ids: string[]
          inserted_count: number
          processing_time_ms: number
          products_created: number
          store_products_linked: number
        }[]
      }
      check_bulk_duplicates: {
        Args: {
          p_barcodes: string[]
          p_expiry_dates: string[]
          p_store_id: string
        }
        Returns: {
          barcode: string
          existing_batch_id: string
          exp_date: string
          is_duplicate: boolean
        }[]
      }
      check_existing_store_products: {
        Args: { pairs: Json }
        Returns: {
          product_id: string
          store_id: string
        }[]
      }
      check_pin_lock_status: { Args: { p_username: string }; Returns: Json }
      check_security_warnings: {
        Args: never
        Returns: {
          item: string
          status: string
          warning_type: string
        }[]
      }
      check_store_access: {
        Args: { store_id_param: string; user_id_param: string }
        Returns: {
          is_active: boolean
          role_in_store: string
          user_id: string
        }[]
      }
      check_user_exists_by_email: { Args: { p_email: string }; Returns: Json }
      check_username_availability: {
        Args: { p_username: string }
        Returns: boolean
      }
      cleanup_backup_table: { Args: never; Returns: string }
      cleanup_duplicate_batches: {
        Args: never
        Returns: {
          deleted_count: number
          iteration: number
        }[]
      }
      create_employee_with_pin: {
        Args: {
          p_email: string
          p_full_name: string
          p_language_preference: string
          p_pin: string
          p_role: string
          p_store_id: string
          p_username: string
        }
        Returns: Json
      }
      delete_next_duplicate_batch: {
        Args: { batch_size?: number }
        Returns: {
          deleted_count: number
        }[]
      }
      disable_batch_automation: { Args: never; Returns: string }
      enable_batch_automation: { Args: never; Returns: string }
      execute_bulk_action: {
        Args: {
          p_action_params: Json
          p_action_type: string
          p_batch_ids: string[]
          p_user_id: string
        }
        Returns: Json
      }
      execute_discount_action: {
        Args: {
          p_batch_id: string
          p_discount_percentage: number
          p_notes?: string
          p_quantity_affected: number
          p_user_id: string
        }
        Returns: Json
      }
      execute_dismiss_action: {
        Args: {
          p_batch_id: string
          p_dismissal_reason: string
          p_notes?: string
          p_user_id: string
        }
        Returns: Json
      }
      execute_dispose_action: {
        Args: {
          p_batch_id: string
          p_disposal_reason: string
          p_notes?: string
          p_quantity_disposed: number
          p_user_id: string
        }
        Returns: Json
      }
      execute_donate_action: {
        Args: {
          p_batch_id: string
          p_donation_recipient_id: string
          p_notes?: string
          p_quantity_affected: number
          p_user_id: string
        }
        Returns: Json
      }
      execute_donate_prepared_action: {
        Args: {
          p_batch_id: string
          p_notes?: string
          p_quantity_affected: number
          p_user_id: string
        }
        Returns: Json
      }
      execute_ignore_action: {
        Args: { p_batch_id: string; p_notes?: string; p_user_id: string }
        Returns: Json
      }
      execute_sold_action: {
        Args: {
          p_batch_id: string
          p_notes?: string
          p_quantity_sold: number
          p_user_id: string
        }
        Returns: Json
      }
      fast_csv_import_skip_duplicates: {
        Args: { p_csv_data: Json; p_store_id: string; p_user_id: string }
        Returns: Json
      }
      find_available_batches_by_barcode: {
        Args: { barcode_param: string; store_id_param: string }
        Returns: {
          available_quantity: number
          batch_id: string
          batch_number: string
          brand_name: string
          category_name: string
          cost_price: number
          created_at: string
          current_quantity: number
          expiry_date: string
          location_code: string
          product_barcode: string
          product_id: string
          product_name: string
          selling_price: number
          status: string
          store_id: string
        }[]
      }
      find_duplicate_batches_bulk: {
        Args: { p_sku_expiry_pairs: string; p_store_id: string }
        Returns: {
          batch_id: string
          batch_number: string
          current_quantity: number
          expiry_date: string
          sku: string
        }[]
      }
      fix_duplicate_batch_numbers: {
        Args: never
        Returns: {
          batch_numbers_fixed: number
          batches_updated: number
        }[]
      }
      get_action_history_enhanced: {
        Args: {
          p_action_type?: string
          p_limit?: number
          p_offset?: number
          p_store_id: string
        }
        Returns: {
          action_type: string
          batch_id: string
          batch_number: string
          discount_percentage: number
          entry_id: string
          notes: string
          original_value: number
          performed_at: string
          performed_by_email: string
          product_name: string
          quantity_affected: number
          recipient_name: string
          recovered_value: number
          total_count: number
        }[]
      }
      get_actionable_batches:
        | { Args: { input_store_id: string }; Returns: Json }
        | {
            Args: { p_limit?: number; p_offset?: number; p_store_id: string }
            Returns: {
              action_date: string
              action_taken: string
              action_user: string
              batch_id: string
              batch_number: string
              composite_score: number
              current_quantity: number
              days_to_expiry: number
              discount_percent: number
              expiry_date: string
              location_code: string
              potential_loss: number
              product_brand: string
              product_name: string
              reason: string
              recommendation: string
              sku: string
              todo_state: string
              total_count: number
              unit_price: number
              urgency: string
              urgency_level: string
            }[]
          }
      get_all_active_with_states: {
        Args: { p_limit?: number; p_offset?: number; p_store_id: string }
        Returns: {
          ai_recommendation: string
          batch_id: string
          batch_number: string
          composite_score: number
          current_quantity: number
          days_to_expiry: number
          expiry_date: string
          hours_since_last_action: number
          product_brand: string
          product_name: string
          todo_state: string
          total_actions_ever: number
          total_count: number
        }[]
      }
      get_automation_status: {
        Args: never
        Returns: {
          active: boolean
          command: string
          job_id: number
          job_name: string
          schedule: string
        }[]
      }
      get_batch_actions_with_details: {
        Args: {
          p_action_type?: string
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
          p_store_id: string
        }
        Returns: {
          action_date: string
          action_id: string
          actual_action: string
          ai_score: number
          batch_id: string
          batch_number: string
          created_at: string
          donation_recipient_id: string
          expiry_date: string
          location_code: string
          notes: string
          original_value: number
          performed_by: string
          product_name: string
          quantity_affected: number
          recipient_name: string
          recipient_type: string
          recommended_action: string
          recovered_value: number
          sku: string
          store_id: string
          total_count: number
        }[]
      }
      get_batch_todo_by_id: { Args: { target_batch_id: string }; Returns: Json }
      get_batch_todo_states:
        | {
            Args: {
              limit_count?: number
              offset_count?: number
              target_store_id: string
            }
            Returns: {
              ai_calculated_at: string
              ai_recommendation: string
              available_quantity: number
              batch_id: string
              batch_number: string
              batch_status: string
              completion_status: string
              composite_score: number
              cost_price: number
              current_quantity: number
              current_selling_price: number
              current_total_value: number
              days_to_expiry: number
              expiry_date: string
              hours_since_last_action: number
              last_action_quantity: number
              last_action_time: string
              last_action_type: string
              last_discount_percent: number
              potential_loss_value: number
              potential_revenue_value: number
              priority_order: number
              product_brand: string
              product_name: string
              profit_margin: number
              profit_margin_percent: number
              selling_price: number
              store_id: string
              todo_state: string
              total_actions_ever: number
              total_discounted_quantity: number
              total_disposed_quantity: number
              total_donated_quantity: number
              total_ignored_quantity: number
              total_sold_quantity: number
              unit_price: number
              urgency_level: string
              view_refreshed_at: string
            }[]
          }
        | {
            Args: {
              p_limit?: number
              p_offset?: number
              p_store_id?: string
              p_todo_state?: string
            }
            Returns: {
              ai_calculated_at: string
              ai_recommendation: string
              available_quantity: number
              batch_id: string
              batch_number: string
              batch_status: string
              composite_score: number
              current_quantity: number
              expiry_date: string
              last_action_time: string
              last_action_type: string
              product_brand: string
              product_name: string
              store_id: string
              todo_state: string
              urgency_level: string
            }[]
          }
        | {
            Args: { limit_rows?: number; target_store_id?: string }
            Returns: {
              ai_calculated_at: string
              ai_recommendation: string
              available_quantity: number
              batch_id: string
              batch_number: string
              batch_status: string
              completion_status: string
              composite_score: number
              current_quantity: number
              days_to_expiry: number
              expiry_date: string
              hours_since_last_action: number
              last_action_quantity: number
              last_action_time: string
              last_action_type: string
              last_discount_percent: number
              priority_order: number
              product_brand: string
              product_name: string
              store_id: string
              todo_state: string
              total_actions_ever: number
              total_discounted_quantity: number
              total_disposed_quantity: number
              total_donated_quantity: number
              total_ignored_quantity: number
              total_sold_quantity: number
              urgency_level: string
              view_refreshed_at: string
            }[]
          }
      get_batch_todo_summary: {
        Args: { target_store_id: string }
        Returns: {
          completed_count: number
          critical_urgency_count: number
          high_urgency_count: number
          immediate_action_count: number
          in_progress_count: number
          last_refreshed: string
          pending_action_count: number
          total_batches: number
          total_potential_loss: number
        }[]
      }
      get_batch_todos_by_state: {
        Args: {
          filter_todo_state?: string
          limit_count?: number
          offset_count?: number
          target_store_id: string
        }
        Returns: {
          ai_recommendation: string
          batch_id: string
          batch_number: string
          current_quantity: number
          current_selling_price: number
          days_to_expiry: number
          expiry_date: string
          last_action_type: string
          potential_loss_value: number
          product_name: string
          todo_state: string
          urgency_level: string
        }[]
      }
      get_batches_page: {
        Args: {
          p_filters?: Json
          p_page?: number
          p_page_size?: number
          p_store_id: string
        }
        Returns: {
          available_quantity: number
          barcode: string
          batch_id: string
          batch_number: string
          batch_source: string
          cost_price: number
          created_at: string
          current_quantity: number
          expiry_date: string
          location_code: string
          product_brand: string
          product_id: string
          product_name: string
          selling_price: number
          sku: string
          status: string
          total_count: number
          updated_at: string
          verification_status: string
        }[]
      }
      get_batches_paginated: {
        Args: {
          p_expiring_in_days?: number
          p_expiry_date_from?: string
          p_expiry_date_to?: string
          p_has_stock?: boolean
          p_location_code?: string
          p_page?: number
          p_page_size?: number
          p_product_id?: string
          p_received_date_from?: string
          p_received_date_to?: string
          p_sort_direction?: string
          p_sort_field?: string
          p_status?: string
          p_store_id: string
          p_supplier?: string
        }
        Returns: {
          available_quantity: number
          batch_id: string
          batch_number: string
          batch_source: string
          cost_price: number
          created_at: string
          created_by: string
          current_quantity: number
          expiry_date: string
          initial_quantity: number
          location_code: string
          manufacture_date: string
          ocr_confidence: number
          ocr_extracted_date: string
          product_barcode: string
          product_brand: string
          product_category_code: string
          product_category_id: string
          product_category_name_en: string
          product_category_name_fr: string
          product_description: string
          product_id: string
          product_image_url: string
          product_name: string
          product_sku: string
          product_typical_shelf_life_days: number
          product_unit_type: string
          received_date: string
          reserved_quantity: number
          scan_confidence: number
          scanned_barcode: string
          selling_price: number
          status: string
          store_id: string
          supplier: string
          total_count: number
          updated_at: string
          verification_status: string
        }[]
      }
      get_csv_upload_stats: {
        Args: { p_days_back?: number; p_store_id: string }
        Returns: {
          avg_batches_per_upload: number
          batch_source: string
          latest_upload: string
          total_batches: number
          upload_count: number
        }[]
      }
      get_current_kpis: {
        Args: { p_store_id: string }
        Returns: {
          kpi_name: string
          kpi_value: number
          timestamp_value: string
        }[]
      }
      get_current_user_preferences: {
        Args: never
        Returns: {
          created_at: string
          preferences: Json
          primary_store_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_current_user_with_pin_auth: {
        Args: { p_user_id?: string; p_username?: string }
        Returns: Json
      }
      get_dashboard_summary: {
        Args: { p_store_id: string }
        Returns: {
          critical_count: number
          expired_items_count: number
          expired_items_value: number
          high_count: number
          low_count: number
          medium_count: number
          needs_attention_count: number
          needs_attention_percentage: number
          ok_count: number
          total_active_batches: number
        }[]
      }
      get_dashboard_summary_json: {
        Args: { p_store_id: string }
        Returns: Json
      }
      get_donated_items: {
        Args: {
          p_days_back?: number
          p_limit?: number
          p_offset?: number
          p_store_id: string
        }
        Returns: {
          batch_id: string
          batch_number: string
          donated_at: string
          donation_recipient_name: string
          expiry_date: string
          notes: string
          product_brand: string
          product_name: string
          quantity_donated: number
          total_count: number
        }[]
      }
      get_enum_values: {
        Args: { enum_name: string; schema_name?: string }
        Returns: string[]
      }
      get_expiring_batches: {
        Args: { p_days_ahead?: number; p_store_id: string }
        Returns: {
          available_quantity: number
          batch_id: string
          batch_number: string
          cost_price: number
          current_quantity: number
          days_until_expiry: number
          expiry_date: string
          location_code: string
          product_barcode: string
          product_brand: string
          product_category_code: string
          product_category_name_en: string
          product_category_name_fr: string
          product_id: string
          product_name: string
          product_sku: string
          selling_price: number
          status: string
          store_id: string
          supplier: string
          total_value: number
        }[]
      }
      get_items_needing_reeval: {
        Args: { p_limit?: number; p_offset?: number; p_store_id: string }
        Returns: {
          ai_calculated_at: string
          ai_recommendation: string
          batch_id: string
          batch_number: string
          composite_score: number
          current_quantity: number
          expiry_date: string
          last_action_time: string
          last_action_type: string
          product_brand: string
          product_name: string
          total_count: number
        }[]
      }
      get_kpi_comparison: {
        Args: {
          p_compare_end: string
          p_compare_start: string
          p_current_end: string
          p_current_start: string
          p_store_id: string
        }
        Returns: {
          change_percent: number
          change_value: number
          current_value: number
          kpi_name: string
          previous_value: number
        }[]
      }
      get_low_stock_batches: {
        Args: { p_store_id: string; p_threshold_quantity?: number }
        Returns: {
          available_quantity: number
          batch_id: string
          batch_number: string
          current_quantity: number
          expiry_date: string
          product_category_code: string
          product_category_name_en: string
          product_id: string
          product_name: string
          product_sku: string
          status: string
        }[]
      }
      get_pending_actions: {
        Args: { p_limit?: number; p_offset?: number; p_store_id: string }
        Returns: {
          ai_recommendation: string
          batch_id: string
          batch_number: string
          composite_score: number
          current_quantity: number
          days_to_expiry: number
          expiry_date: string
          priority_order: number
          product_brand: string
          product_name: string
          total_count: number
          urgency_level: string
        }[]
      }
      get_products_paginated: {
        Args: {
          p_brand?: string
          p_category_code?: string
          p_page_offset?: number
          p_page_size?: number
          p_sort_direction?: string
          p_sort_field?: string
          p_store_id: string
        }
        Returns: {
          active_batches_count: number
          avg_days_to_expiry: number
          barcode: string
          barcode_type: string
          base_cost_price: number
          base_selling_price: number
          brand: string
          calculated_active_batches_count: number
          calculated_total_stock: number
          category_code: string
          category_display_name: string
          category_display_name_fr: string
          category_id: string
          created_at: string
          created_by: string
          description: string
          image_url: string
          is_verified: boolean
          last_scanned_at: string
          last_verified: string
          name: string
          open_food_facts_data: Json
          product_id: string
          sku: string
          store_cost_price: number
          store_is_active: boolean
          store_selling_price: number
          store_sku: string
          supplier_code: string
          total_count: number
          total_stock: number
          typical_shelf_life_days: number
          unit_type: string
          updated_at: string
          verification_count: number
        }[]
      }
      get_recently_discounted: {
        Args: { p_limit?: number; p_offset?: number; p_store_id: string }
        Returns: {
          batch_id: string
          batch_number: string
          current_quantity: number
          expiry_date: string
          hours_since_last_action: number
          last_action_time: string
          last_discount_percent: number
          product_brand: string
          product_name: string
          total_count: number
          total_discounted_quantity: number
        }[]
      }
      get_recently_expired_enhanced: {
        Args: { p_limit?: number; p_offset?: number; p_store_id: string }
        Returns: {
          ai_recommendation: string
          batch_id: string
          batch_number: string
          current_quantity: number
          days_since_expiry: number
          expiry_date: string
          has_recent_actions: boolean
          product_brand: string
          product_name: string
          total_count: number
        }[]
      }
      get_store_alerts_optimized: {
        Args: { p_store_id: string }
        Returns: {
          batch_id: string
          batch_number: string
          brand: string
          calculated_at: string
          category: string
          composite_score: number
          cost_price: number
          current_quantity: number
          days_to_expiry: number
          expiry_date: string
          location_code: string
          margin_percent: number
          potential_loss: number
          product_name: string
          recommendation: string
          selling_price: number
          sku: string
          supplier: string
          unit_type: string
          urgency_level: string
          urgency_level_calculated: string
        }[]
      }
      get_store_analytics_overview: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_store_id: string
          p_threshold?: number
        }
        Returns: {
          actions_taken: number
          active_alerts: number
          avg_composite_score: number
          discount_actions: number
          expiring_items: number
          total_batches: number
          total_discount_value: number
          total_products: number
          total_value: number
          urgent_items: number
        }[]
      }
      get_store_category_analytics: {
        Args: { p_store_id: string }
        Returns: {
          avg_score: number
          category: string
          expiring_3days: number
          high_urgency: number
          total_items: number
          total_value: number
        }[]
      }
      get_store_insights: { Args: { target_store_id: string }; Returns: Json }
      get_store_settings: { Args: { store_id_param: string }; Returns: Json }
      get_store_settings_complete: {
        Args: { store_id_param: string }
        Returns: Json
      }
      get_store_thresholds: {
        Args: { p_store_id: string }
        Returns: {
          critical_threshold: number
          warning_threshold: number
        }[]
      }
      get_store_users: {
        Args: { input_store_id: string }
        Returns: {
          assigned_at: string
          assigned_by: string
          can_use_pin_auth: boolean
          created_at: string
          email: string
          is_active: boolean
          permissions: Json
          pin_access_level: string
          pin_permissions: Json
          raw_user_meta_data: Json
          role_in_store: string
          store_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_store_users_paginated: {
        Args: {
          input_store_id: string
          page_number?: number
          page_size?: number
          pin_auth_filter?: boolean
          role_filter?: string
        }
        Returns: {
          assigned_at: string
          assigned_by: string
          can_use_pin_auth: boolean
          created_at: string
          email: string
          is_active: boolean
          permissions: Json
          pin_access_level: string
          pin_permissions: Json
          raw_user_meta_data: Json
          role_in_store: string
          store_id: string
          total_count: number
          updated_at: string
          user_id: string
        }[]
      }
      get_store_waste_analytics: {
        Args: { p_end_date: string; p_start_date: string; p_store_id: string }
        Returns: {
          expired_items: number
          expiring_soon: number
          prevention_potential: number
          waste_by_category: Json
          waste_value: number
        }[]
      }
      get_stores_with_batch_counts: {
        Args: { store_ids: string[] }
        Returns: {
          address: string
          batch_count: number
          business_name: string
          city: string
          country: string
          created_at: string
          default_markup_percent: number
          is_active: boolean
          onboarding_completed: boolean
          owner_id: string
          postal_code: string
          size_category: string
          store_code: string
          store_id: string
          store_name: string
          store_type: string
          timezone: string
          updated_at: string
          waste_reduction_target_percent: number
        }[]
      }
      get_todos_counts_with_filters: {
        Args: { p_filters?: Json; p_store_id: string }
        Returns: Json
      }
      get_todos_dashboard: {
        Args: { p_store_id: string }
        Returns: {
          ai_recommendation: string
          batch_id: string
          batch_number: string
          completion_status: string
          composite_score: number
          current_quantity: number
          days_to_expiry: number
          expiry_date: string
          hours_since_last_action: number
          last_action_time: string
          last_action_type: Database["public"]["Enums"]["action_type"]
          last_discount_percent: number
          priority_order: number
          product_brand: string
          product_name: string
          todo_state: string
          urgency_level: string
        }[]
      }
      get_todos_dashboard_overview: {
        Args: { p_store_id: string }
        Returns: {
          avg_score: number
          item_count: number
          todo_state: string
          total_value: number
          urgency_distribution: Json
        }[]
      }
      get_todos_summary: {
        Args: { p_store_id: string }
        Returns: {
          last_refreshed: string
          needs_reeval_count: number
          pending_actions_count: number
          recently_discounted_count: number
          recently_donated_count: number
          recently_expired_count: number
          total_active_count: number
        }[]
      }
      get_todos_with_filters: {
        Args: {
          p_filters?: Json
          p_limit?: number
          p_offset?: number
          p_store_id: string
        }
        Returns: {
          ai_calculated_at: string
          ai_recommendation: string
          available_quantity: number
          batch_id: string
          batch_number: string
          batch_status: string
          completion_status: string
          composite_score: number
          cost_price: number
          current_quantity: number
          current_selling_price: number
          current_total_value: number
          days_to_expiry: number
          expiry_date: string
          hours_since_last_action: number
          last_action_quantity: number
          last_action_time: string
          last_action_type: Database["public"]["Enums"]["action_type"]
          last_discount_percent: number
          potential_loss_value: number
          potential_revenue_value: number
          priority_order: number
          product_brand: string
          product_name: string
          profit_margin: number
          profit_margin_percent: number
          selling_price: number
          store_id: string
          todo_state: string
          total_actions_ever: number
          total_discounted_quantity: number
          total_disposed_quantity: number
          total_donated_quantity: number
          total_ignored_quantity: number
          total_sold_quantity: number
          unit_price: number
          urgency_level: string
          view_refreshed_at: string
        }[]
      }
      get_urgent_todos_count: { Args: { p_store_id: string }; Returns: number }
      get_user_by_username: { Args: { p_username: string }; Returns: Json }
      get_user_complete_profile: {
        Args: { p_store_id?: string; p_user_id: string }
        Returns: Json
      }
      get_user_preferences_fast: {
        Args: never
        Returns: {
          created_at: string
          preferences: Json
          primary_store_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_store_role: {
        Args: { p_store_id: string; p_user_id: string }
        Returns: {
          can_use_pin_auth: boolean
          is_active: boolean
          permissions: Json
          pin_access_level: string
          role_in_store: string
          store_id: string
          store_name: string
          user_id: string
        }[]
      }
      get_user_stores_with_details: {
        Args: never
        Returns: {
          address: string
          assigned_at: string
          business_name: string
          city: string
          country: string
          created_at: string
          default_markup_percent: number
          is_active: boolean
          onboarding_completed: boolean
          owner_id: string
          permissions: Json
          postal_code: string
          role_in_store: string
          size_category: string
          store_code: string
          store_id: string
          store_name: string
          store_type: string
          timezone: string
          updated_at: string
          waste_reduction_target_percent: number
        }[]
      }
      get_users_with_metadata: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          email_verified: boolean
          full_name: string
          id: string
          is_active: boolean
          language_preference: string
          last_login: string
          phone: string
          phone_verified: boolean
          raw_user_meta_data: Json
          updated_at: string
          username: string
        }[]
      }
      has_batches: { Args: { p_store_id: string }; Returns: boolean }
      invite_user_to_store: {
        Args: {
          p_permissions?: Json
          p_role_in_store?: string
          p_store_id: string
          p_user_email: string
        }
        Returns: Json
      }
      lookup_product_with_cache: {
        Args: { barcode_param: string }
        Returns: {
          cached_at: string
          found: boolean
          product_data: Json
          source: string
        }[]
      }
      override_batch_status: {
        Args: {
          p_batch_id: string
          p_new_status: string
          p_notes?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      remove_user_from_store: {
        Args: { p_store_id: string; p_target_user_id: string }
        Returns: Json
      }
      reset_pin_attempts: { Args: { p_username: string }; Returns: Json }
      resolve_bulk_products: {
        Args: { p_barcodes: string[]; p_names: string[]; p_skus: string[] }
        Returns: {
          found_method: string
          input_index: number
          name: string
          product_id: string
          sku: string
        }[]
      }
      resolve_bulk_products_simple: {
        Args: { p_barcodes: string[]; p_names: string[]; p_skus: string[] }
        Returns: {
          found_method: string
          input_index: number
          product_id: string
        }[]
      }
      search_products_with_stock: {
        Args: {
          max_results?: number
          search_query: string
          store_id_param?: string
        }
        Returns: {
          barcode: string
          batch_count: number
          brand: string
          category_name: string
          image_url: string
          is_out_of_stock: boolean
          name: string
          product_id: string
          total_available_quantity: number
          unit_type: string
        }[]
      }
      security_summary: {
        Args: never
        Returns: {
          compliance_status: string
          function_issues: number
          rls_issues: number
          total_issues: number
        }[]
      }
      simple_update_store_user_test: {
        Args: {
          input_can_use_pin_auth: boolean
          input_store_id: string
          input_user_id: string
        }
        Returns: string
      }
      test_business_schema_access: {
        Args: never
        Returns: {
          store_count: number
          user_count: number
        }[]
      }
      test_csv_performance: {
        Args: { p_item_count: number; p_store_id: string }
        Returns: {
          duration_ms: number
          item_count: number
          items_per_second: number
          operation_type: string
        }[]
      }
      trigger_batch_automation: {
        Args: never
        Returns: {
          expired_count: number
          message: string
          next_scheduled_run: string
          sold_out_count: number
          updated_count: number
        }[]
      }
      update_batch_quantity: {
        Args: {
          batch_id_param: string
          quantity_to_remove: number
          reason_param?: string
        }
        Returns: {
          error_message: string
          new_quantity: number
          success: boolean
        }[]
      }
      update_expired_batch_statuses: {
        Args: never
        Returns: {
          details: Json
          expired_count: number
          sold_out_count: number
          updated_count: number
        }[]
      }
      update_store_advanced_settings: {
        Args: {
          p_backup_preferences?: Json
          p_critical_threshold?: number
          p_currency?: string
          p_display_preferences?: Json
          p_notification_preferences?: Json
          p_opening_hours?: Json
          p_peak_hours?: Json
          p_scoring_weights?: Json
          p_store_id: string
          p_warning_threshold?: number
          p_weather_location_lat?: number
          p_weather_location_lon?: number
        }
        Returns: {
          backup_preferences: Json
          critical_threshold: number
          currency: string
          display_preferences: Json
          notification_preferences: Json
          opening_hours: Json
          peak_hours: Json
          scoring_weights: Json
          store_id: string
          updated_at: string
          warning_threshold: number
          weather_location_lat: number
          weather_location_lon: number
        }[]
      }
      update_store_settings: {
        Args: {
          address_param?: string
          business_name_param?: string
          city_param?: string
          country_param?: string
          default_markup_percent_param?: number
          description_param?: string
          email_param?: string
          phone_param?: string
          postal_code_param?: string
          size_category_param?: string
          store_code_param?: string
          store_id_param: string
          store_name_param?: string
          store_type_param?: string
          waste_reduction_target_percent_param?: number
          website_url_param?: string
        }
        Returns: Json
      }
      update_store_thresholds: {
        Args: {
          p_critical_threshold: number
          p_store_id: string
          p_warning_threshold: number
        }
        Returns: {
          critical_threshold: number
          store_id: string
          updated_at: string
          warning_threshold: number
        }[]
      }
      update_store_user_safe: {
        Args: {
          input_can_use_pin_auth?: boolean
          input_is_active?: boolean
          input_permissions?: Json
          input_pin_access_level?: string
          input_pin_permissions?: Json
          input_role_in_store?: string
          input_store_id: string
          input_user_id: string
        }
        Returns: {
          assigned_at: string
          assigned_by: string
          can_use_pin_auth: boolean
          created_at: string
          email: string
          is_active: boolean
          permissions: Json
          pin_access_level: string
          pin_permissions: Json
          raw_user_meta_data: Json
          role_in_store: string
          store_id: string
          updated_at: string
          user_id: string
        }[]
      }
      update_user_email: {
        Args: { new_email: string; target_user_id: string }
        Returns: Json
      }
      update_user_language_preference: {
        Args: { new_language_preference: string; target_user_id: string }
        Returns: Json
      }
      update_user_metadata: {
        Args: { metadata_updates: Json; target_user_id: string }
        Returns: Json
      }
      update_user_phone: {
        Args: { new_phone: string; target_user_id: string }
        Returns: Json
      }
      update_user_pin: {
        Args: { p_new_pin: string; p_old_pin: string; p_username: string }
        Returns: Json
      }
      user_has_pin_access: {
        Args: { target_store_id: string }
        Returns: boolean
      }
      user_has_store_access: {
        Args: { required_role?: string; target_store_id: string }
        Returns: boolean
      }
      validate_pin_login: {
        Args: { p_pin: string; p_username: string }
        Returns: Json
      }
    }
    Enums: {
      action_type:
        | "discount"
        | "donate"
        | "dispose"
        | "maintain"
        | "ignored"
        | "donate_prepared"
        | "sold"
      actiontype: "DISCOUNT" | "DONATE" | "DISPOSE" | "MAINTAIN" | "IGNORED"
      donation_recipient_type:
        | "food_bank"
        | "soup_kitchen"
        | "charity"
        | "religious_org"
        | "community_group"
        | "animal_shelter"
        | "school"
        | "elderly_care"
        | "homeless_shelter"
        | "other"
      donationrecipienttype:
        | "FOOD_BANK"
        | "SOUP_KITCHEN"
        | "CHARITY"
        | "RELIGIOUS_ORG"
        | "COMMUNITY_GROUP"
        | "ANIMAL_SHELTER"
        | "SCHOOL"
        | "ELDERLY_CARE"
        | "HOMELESS_SHELTER"
        | "OTHER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  scoring: {
    Tables: {
      category_weights: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          is_active: boolean | null
          spoilage_risk_weight: number
          turnover_speed_weight: number
          updated_at: string | null
          value_impact_weight: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          spoilage_risk_weight?: number
          turnover_speed_weight?: number
          updated_at?: string | null
          value_impact_weight?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          spoilage_risk_weight?: number
          turnover_speed_weight?: number
          updated_at?: string | null
          value_impact_weight?: number
        }
        Relationships: []
      }
      product_scores: {
        Row: {
          batch_id: string | null
          calculated_at: string | null
          category_risk_score: number | null
          composite_score: number | null
          confidence_level: number | null
          days_to_expiry: number | null
          discount_percent: number | null
          expiry_score: number | null
          financial_impact_score: number | null
          margin_percent: number | null
          margin_score: number | null
          ml_enhanced: boolean | null
          potential_loss: number | null
          quantity_risk_score: number | null
          reason: string | null
          recommendation: string | null
          score_id: string
          store_id: string | null
          turnover_score: number | null
          urgency_level: string | null
          velocity_score: number | null
        }
        Insert: {
          batch_id?: string | null
          calculated_at?: string | null
          category_risk_score?: number | null
          composite_score?: number | null
          confidence_level?: number | null
          days_to_expiry?: number | null
          discount_percent?: number | null
          expiry_score?: number | null
          financial_impact_score?: number | null
          margin_percent?: number | null
          margin_score?: number | null
          ml_enhanced?: boolean | null
          potential_loss?: number | null
          quantity_risk_score?: number | null
          reason?: string | null
          recommendation?: string | null
          score_id?: string
          store_id?: string | null
          turnover_score?: number | null
          urgency_level?: string | null
          velocity_score?: number | null
        }
        Update: {
          batch_id?: string | null
          calculated_at?: string | null
          category_risk_score?: number | null
          composite_score?: number | null
          confidence_level?: number | null
          days_to_expiry?: number | null
          discount_percent?: number | null
          expiry_score?: number | null
          financial_impact_score?: number | null
          margin_percent?: number | null
          margin_score?: number | null
          ml_enhanced?: boolean | null
          potential_loss?: number | null
          quantity_risk_score?: number | null
          reason?: string | null
          recommendation?: string | null
          score_id?: string
          store_id?: string | null
          turnover_score?: number | null
          urgency_level?: string | null
          velocity_score?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_batch_score: {
        Args: {
          p_category_id?: string
          p_expiration_date: string
          p_quantity?: number
          p_store_id: string
        }
        Returns: Json
      }
      recalculate_store_scores: {
        Args: { p_store_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  timeseries: {
    Tables: {
      external_factors: {
        Row: {
          day_of_week: number | null
          factor_id: string
          hour_of_day: number | null
          humidity: number | null
          is_holiday: boolean | null
          is_rainy: boolean | null
          local_events: string[] | null
          recorded_at: string | null
          store_id: string | null
          temperature: number | null
          week_of_year: number | null
        }
        Insert: {
          day_of_week?: number | null
          factor_id?: string
          hour_of_day?: number | null
          humidity?: number | null
          is_holiday?: boolean | null
          is_rainy?: boolean | null
          local_events?: string[] | null
          recorded_at?: string | null
          store_id?: string | null
          temperature?: number | null
          week_of_year?: number | null
        }
        Update: {
          day_of_week?: number | null
          factor_id?: string
          hour_of_day?: number | null
          humidity?: number | null
          is_holiday?: boolean | null
          is_rainy?: boolean | null
          local_events?: string[] | null
          recorded_at?: string | null
          store_id?: string | null
          temperature?: number | null
          week_of_year?: number | null
        }
        Relationships: []
      }
      inventory_snapshots: {
        Row: {
          batch_id: string | null
          day_of_week: number | null
          days_to_expiry: number | null
          hour_of_day: number | null
          is_holiday: boolean | null
          is_weekend: boolean | null
          price: number | null
          quantity: number | null
          sku: string | null
          snapshot_id: string
          snapshot_timestamp: string | null
          store_id: string | null
          temperature: number | null
        }
        Insert: {
          batch_id?: string | null
          day_of_week?: number | null
          days_to_expiry?: number | null
          hour_of_day?: number | null
          is_holiday?: boolean | null
          is_weekend?: boolean | null
          price?: number | null
          quantity?: number | null
          sku?: string | null
          snapshot_id?: string
          snapshot_timestamp?: string | null
          store_id?: string | null
          temperature?: number | null
        }
        Update: {
          batch_id?: string | null
          day_of_week?: number | null
          days_to_expiry?: number | null
          hour_of_day?: number | null
          is_holiday?: boolean | null
          is_weekend?: boolean | null
          price?: number | null
          quantity?: number | null
          sku?: string | null
          snapshot_id?: string
          snapshot_timestamp?: string | null
          store_id?: string | null
          temperature?: number | null
        }
        Relationships: []
      }
      sales_events: {
        Row: {
          batch_id: string | null
          channel: string | null
          customer_type: string | null
          event_id: string
          quantity_sold: number | null
          sale_price: number | null
          sale_timestamp: string | null
          sku: string | null
          store_id: string | null
        }
        Insert: {
          batch_id?: string | null
          channel?: string | null
          customer_type?: string | null
          event_id?: string
          quantity_sold?: number | null
          sale_price?: number | null
          sale_timestamp?: string | null
          sku?: string | null
          store_id?: string | null
        }
        Update: {
          batch_id?: string | null
          channel?: string | null
          customer_type?: string | null
          event_id?: string
          quantity_sold?: number | null
          sale_price?: number | null
          sale_timestamp?: string | null
          sku?: string | null
          store_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  user_mgmt: {
    Tables: {
      gdpr_deletion_log: {
        Row: {
          business_impact_notes: string | null
          created_at: string | null
          deletion_completed_at: string | null
          deletion_requested_at: string | null
          deletion_type: string | null
          id: string
          performed_by: string | null
          user_email: string | null
          user_full_name: string | null
          user_id: string | null
        }
        Insert: {
          business_impact_notes?: string | null
          created_at?: string | null
          deletion_completed_at?: string | null
          deletion_requested_at?: string | null
          deletion_type?: string | null
          id?: string
          performed_by?: string | null
          user_email?: string | null
          user_full_name?: string | null
          user_id?: string | null
        }
        Update: {
          business_impact_notes?: string | null
          created_at?: string | null
          deletion_completed_at?: string | null
          deletion_requested_at?: string | null
          deletion_type?: string | null
          id?: string
          performed_by?: string | null
          user_email?: string | null
          user_full_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          role_id: string
          role_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          role_id?: string
          role_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          role_id?: string
          role_name?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          preferences: Json
          primary_store_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          preferences?: Json
          primary_store_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          preferences?: Json
          primary_store_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          is_active: boolean | null
          password_hash: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          is_active?: boolean | null
          password_hash?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          is_active?: boolean | null
          password_hash?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gdpr_delete_user: {
        Args: {
          deletion_type?: string
          performed_by_user_id?: string
          target_user_id: string
        }
        Returns: Json
      }
      gdpr_delete_user_and_stores: {
        Args: {
          delete_owned_stores?: boolean
          deletion_type?: string
          performed_by_user_id?: string
          target_user_id: string
        }
        Returns: Json
      }
      get_current_user_preferences: {
        Args: never
        Returns: {
          created_at: string
          preferences: Json
          primary_store_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_current_user_preferences_v2: {
        Args: never
        Returns: {
          created_at: string
          preferences: Json
          primary_store_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_roles: { Args: { user_uuid?: string }; Returns: string[] }
      has_role: {
        Args: { role_name: string; user_uuid?: string }
        Returns: boolean
      }
      has_role_cached: {
        Args: { role_name: string; user_uuid: string }
        Returns: boolean
      }
      request_account_deletion: {
        Args: { deletion_reason?: string }
        Returns: Json
      }
      update_primary_store: { Args: { p_store_id: string }; Returns: undefined }
      user_can_access_store: { Args: { store_uuid: string }; Returns: boolean }
      user_is_store_manager: { Args: { store_uuid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  analytics: {
    Enums: {},
  },
  business: {
    Enums: {
      store_type_enum: [
        "supermarket",
        "convenience",
        "restaurant",
        "bakery",
        "butcher",
        "organic",
      ],
    },
  },
  inventory: {
    Enums: {},
  },
  public: {
    Enums: {
      action_type: [
        "discount",
        "donate",
        "dispose",
        "maintain",
        "ignored",
        "donate_prepared",
        "sold",
      ],
      actiontype: ["DISCOUNT", "DONATE", "DISPOSE", "MAINTAIN", "IGNORED"],
      donation_recipient_type: [
        "food_bank",
        "soup_kitchen",
        "charity",
        "religious_org",
        "community_group",
        "animal_shelter",
        "school",
        "elderly_care",
        "homeless_shelter",
        "other",
      ],
      donationrecipienttype: [
        "FOOD_BANK",
        "SOUP_KITCHEN",
        "CHARITY",
        "RELIGIOUS_ORG",
        "COMMUNITY_GROUP",
        "ANIMAL_SHELTER",
        "SCHOOL",
        "ELDERLY_CARE",
        "HOMELESS_SHELTER",
        "OTHER",
      ],
    },
  },
  scoring: {
    Enums: {},
  },
  timeseries: {
    Enums: {},
  },
  user_mgmt: {
    Enums: {},
  },
} as const
