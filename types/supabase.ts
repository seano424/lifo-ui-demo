export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)'
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
            foreignKeyName: 'store_settings_store_id_fkey'
            columns: ['store_id']
            isOneToOne: true
            referencedRelation: 'stores'
            referencedColumns: ['store_id']
          },
        ]
      }
      store_users: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          can_use_pin_auth: boolean | null
          is_active: boolean | null
          permissions: Json | null
          pin_access_level: string | null
          pin_permissions: Json | null
          role_in_store: string | null
          store_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_use_pin_auth?: boolean | null
          is_active?: boolean | null
          permissions?: Json | null
          pin_access_level?: string | null
          pin_permissions?: Json | null
          role_in_store?: string | null
          store_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_use_pin_auth?: boolean | null
          is_active?: boolean | null
          permissions?: Json | null
          pin_access_level?: string | null
          pin_permissions?: Json | null
          role_in_store?: string | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'store_users_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['store_id']
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
          store_type: Database['business']['Enums']['store_type_enum'] | null
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
          store_type?: Database['business']['Enums']['store_type_enum'] | null
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
          store_type?: Database['business']['Enums']['store_type_enum'] | null
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
          store_type_value: Database['business']['Enums']['store_type_enum'] | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_store_for_user: {
        Args: {
          p_store_name: string
          p_store_code: string
          p_store_type?: string
          p_address?: string
          p_city?: string
          p_postal_code?: string
          p_country?: string
          p_business_name?: string
          p_phone?: string
          p_size_category?: string
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
          store_type: Database['business']['Enums']['store_type_enum'] | null
          timezone: string | null
          updated_at: string | null
          waste_reduction_target_percent: number | null
          website_url: string | null
        }
      }
      get_store_types: {
        Args: Record<PropertyKey, never>
        Returns: Database['business']['Enums']['store_type_enum'][]
      }
      user_can_manage_store_users: {
        Args: { target_store_id: string; target_user_id?: string }
        Returns: boolean
      }
      user_has_store_access: {
        Args: { store_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      store_type_enum:
        | 'supermarket'
        | 'convenience'
        | 'restaurant'
        | 'bakery'
        | 'butcher'
        | 'organic'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  inventory: {
    Tables: {
      batch_actions: {
        Row: {
          action_date: string | null
          action_id: string
          actual_action: Database['public']['Enums']['action_type']
          ai_score: number | null
          batch_id: string
          created_at: string | null
          donation_recipient_id: string | null
          notes: string | null
          original_value: number | null
          performed_by: string | null
          quantity_affected: number | null
          recommended_action: Database['public']['Enums']['action_type']
          recovered_value: number | null
          store_id: string
        }
        Insert: {
          action_date?: string | null
          action_id?: string
          actual_action: Database['public']['Enums']['action_type']
          ai_score?: number | null
          batch_id: string
          created_at?: string | null
          donation_recipient_id?: string | null
          notes?: string | null
          original_value?: number | null
          performed_by?: string | null
          quantity_affected?: number | null
          recommended_action: Database['public']['Enums']['action_type']
          recovered_value?: number | null
          store_id: string
        }
        Update: {
          action_date?: string | null
          action_id?: string
          actual_action?: Database['public']['Enums']['action_type']
          ai_score?: number | null
          batch_id?: string
          created_at?: string | null
          donation_recipient_id?: string | null
          notes?: string | null
          original_value?: number | null
          performed_by?: string | null
          quantity_affected?: number | null
          recommended_action?: Database['public']['Enums']['action_type']
          recovered_value?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'batch_actions_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'batch_status'
            referencedColumns: ['batch_id']
          },
          {
            foreignKeyName: 'batch_actions_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'batches'
            referencedColumns: ['batch_id']
          },
          {
            foreignKeyName: 'batch_actions_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'expiring_batches'
            referencedColumns: ['batch_id']
          },
          {
            foreignKeyName: 'batch_actions_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'expiring_products'
            referencedColumns: ['batch_id']
          },
          {
            foreignKeyName: 'batch_actions_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'my_store_batches'
            referencedColumns: ['batch_id']
          },
          {
            foreignKeyName: 'batch_actions_donation_recipient_id_fkey'
            columns: ['donation_recipient_id']
            isOneToOne: false
            referencedRelation: 'donation_recipients'
            referencedColumns: ['recipient_id']
          },
        ]
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
          store_id: string | null
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
          store_id?: string | null
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
          store_id?: string | null
          supplier?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'batches_processing_batch_id_fkey'
            columns: ['processing_batch_id']
            isOneToOne: false
            referencedRelation: 'ocr_processing_batches'
            referencedColumns: ['batch_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'expiring_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'low_stock_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products_needing_barcodes'
            referencedColumns: ['product_id']
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
          recipient_type: Database['public']['Enums']['donation_recipient_type']
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
          recipient_type: Database['public']['Enums']['donation_recipient_type']
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
          recipient_type?: Database['public']['Enums']['donation_recipient_type']
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
          category: string
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
          category: string
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
          category?: string
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
        Relationships: []
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
            foreignKeyName: 'store_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'expiring_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'store_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'low_stock_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'store_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'store_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products_needing_barcodes'
            referencedColumns: ['product_id']
          },
        ]
      }
    }
    Views: {
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
        Relationships: [
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'expiring_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'low_stock_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products_needing_barcodes'
            referencedColumns: ['product_id']
          },
        ]
      }
      donation_impact: {
        Row: {
          donation_count: number | null
          last_donation_date: string | null
          recipient_name: string | null
          recipient_type: Database['public']['Enums']['donation_recipient_type'] | null
          store_id: string | null
          total_quantity_donated: number | null
          total_tax_benefit: number | null
          total_value_donated: number | null
        }
        Relationships: []
      }
      expiring_batches: {
        Row: {
          available_quantity: number | null
          batch_id: string | null
          batch_number: string | null
          category: string | null
          current_quantity: number | null
          days_to_expiry: number | null
          expiry_date: string | null
          location_code: string | null
          product_name: string | null
          sku: string | null
          urgency_level: string | null
        }
        Relationships: []
      }
      expiring_products: {
        Row: {
          active_batches_count: number | null
          avg_days_to_expiry: number | null
          base_cost_price: number | null
          base_selling_price: number | null
          batch_id: string | null
          batch_status: string | null
          brand: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          current_quantity: number | null
          days_to_expiry: number | null
          description: string | null
          expiry_date: string | null
          name: string | null
          product_id: string | null
          sku: string | null
          total_stock: number | null
          typical_shelf_life_days: number | null
          unit_type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      low_stock_products: {
        Row: {
          active_batches_count: number | null
          avg_days_to_expiry: number | null
          base_cost_price: number | null
          base_selling_price: number | null
          brand: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          name: string | null
          product_id: string | null
          sku: string | null
          stock_level: string | null
          total_stock: number | null
          typical_shelf_life_days: number | null
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          active_batches_count?: number | null
          avg_days_to_expiry?: number | null
          base_cost_price?: number | null
          base_selling_price?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          name?: string | null
          product_id?: string | null
          sku?: string | null
          stock_level?: never
          total_stock?: number | null
          typical_shelf_life_days?: number | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active_batches_count?: number | null
          avg_days_to_expiry?: number | null
          base_cost_price?: number | null
          base_selling_price?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          name?: string | null
          product_id?: string | null
          sku?: string | null
          stock_level?: never
          total_stock?: number | null
          typical_shelf_life_days?: number | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      my_store_batches: {
        Row: {
          available_quantity: number | null
          barcode: string | null
          batch_id: string | null
          batch_number: string | null
          batch_source: string | null
          brand: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          current_quantity: number | null
          expiry_date: string | null
          initial_quantity: number | null
          location_code: string | null
          manufacture_date: string | null
          ocr_confidence: number | null
          ocr_extracted_date: string | null
          processing_batch_id: string | null
          product_id: string | null
          product_name: string | null
          received_date: string | null
          reserved_quantity: number | null
          scan_confidence: number | null
          scanned_barcode: string | null
          selling_price: number | null
          status: string | null
          store_cost_price: number | null
          store_id: string | null
          store_name: string | null
          store_selling_price: number | null
          supplier: string | null
          updated_at: string | null
          verification_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'batches_processing_batch_id_fkey'
            columns: ['processing_batch_id']
            isOneToOne: false
            referencedRelation: 'ocr_processing_batches'
            referencedColumns: ['batch_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'expiring_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'low_stock_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products_needing_barcodes'
            referencedColumns: ['product_id']
          },
        ]
      }
      my_store_products: {
        Row: {
          added_by: string | null
          barcode: string | null
          brand: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          is_active: boolean | null
          name: string | null
          product_id: string | null
          selling_price: number | null
          store_id: string | null
          store_name: string | null
          store_sku: string | null
          supplier_code: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'store_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'expiring_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'store_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'low_stock_products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'store_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'store_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products_needing_barcodes'
            referencedColumns: ['product_id']
          },
        ]
      }
      products_needing_barcodes: {
        Row: {
          batch_count: number | null
          brand: string | null
          category: string | null
          latest_batch: string | null
          name: string | null
          product_id: string | null
          store_count: number | null
        }
        Relationships: []
      }
      recommendation_analytics: {
        Row: {
          actual_action: Database['public']['Enums']['action_type'] | null
          avg_ai_score: number | null
          recommendation_count: number | null
          recommended_action: Database['public']['Enums']['action_type'] | null
          recovery_percentage: number | null
          store_id: string | null
          total_original_value: number | null
          total_recovered_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_stores: {
        Args: Record<PropertyKey, never>
        Returns: {
          store_id: string
          store_name: string
          role_in_store: string
        }[]
      }
      user_can_access_store: {
        Args: { store_uuid: string }
        Returns: boolean
      }
      user_can_manage_store: {
        Args: { store_uuid: string }
        Returns: boolean
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
      [_ in never]: never
    }
    Views: {
      inventory_view_for_scoring: {
        Row: {
          batch_id: string | null
          category: string | null
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
          input_store_id: string
          input_user_email: string
          input_role?: string
        }
        Returns: {
          success: boolean
          user_id: string
          message: string
        }[]
      }
      add_product_to_store_safely: {
        Args: {
          p_store_id: string
          p_product_id: string
          p_cost_price?: number
          p_selling_price?: number
          p_store_sku?: string
        }
        Returns: string
      }
      admin_add_test_user: {
        Args: {
          input_store_id: string
          input_email: string
          input_full_name: string
          input_role?: string
        }
        Returns: {
          success: boolean
          user_id: string
          message: string
        }[]
      }
      bulk_csv_import: {
        Args: { p_store_id: string; p_user_id: string; p_csv_data: Json }
        Returns: {
          processed_count: number
          error_messages: string[]
          product_ids_result: string[]
          batch_ids_result: string[]
        }[]
      }
      bulk_insert_csv_batches: {
        Args: { p_store_id: string; p_created_by: string; p_data: Json }
        Returns: {
          inserted_count: number
          batch_ids: string[]
          processing_time_ms: number
        }[]
      }
      bulk_insert_csv_batches_with_store_link: {
        Args: { p_store_id: string; p_created_by: string; p_data: Json }
        Returns: {
          inserted_count: number
          batch_ids: string[]
          processing_time_ms: number
          store_products_linked: number
          products_created: number
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
          exp_date: string
          is_duplicate: boolean
          existing_batch_id: string
        }[]
      }
      check_pin_lock_status: {
        Args: { p_user_id: string } | { p_username: string }
        Returns: Json
      }
      check_security_warnings: {
        Args: Record<PropertyKey, never>
        Returns: {
          warning_type: string
          item: string
          status: string
        }[]
      }
      check_user_exists_by_email: {
        Args: { p_email: string }
        Returns: Json
      }
      check_username_availability: {
        Args: { p_username: string }
        Returns: boolean
      }
      cleanup_backup_table: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_employee_with_pin: {
        Args: {
          p_email: string
          p_full_name: string
          p_username: string
          p_pin: string
          p_store_id: string
          p_role: string
          p_language_preference: string
        }
        Returns: Json
      }
      fast_csv_import_skip_duplicates: {
        Args: { p_store_id: string; p_user_id: string; p_csv_data: Json }
        Returns: Json
      }
      find_duplicate_batches_bulk: {
        Args: { p_store_id: string; p_sku_expiry_pairs: string }
        Returns: {
          sku: string
          expiry_date: string
          batch_id: string
          batch_number: string
          current_quantity: number
        }[]
      }
      generate_pin_hash: {
        Args: { pin_text: string }
        Returns: string
      }
      get_csv_upload_stats: {
        Args: { p_store_id: string; p_days_back?: number }
        Returns: {
          batch_source: string
          upload_count: number
          total_batches: number
          avg_batches_per_upload: number
          latest_upload: string
        }[]
      }
      get_current_user_with_pin_auth: {
        Args: { p_user_id?: string; p_username?: string }
        Returns: Json
      }
      get_enum_values: {
        Args: { enum_name: string; schema_name?: string }
        Returns: string[]
      }
      get_store_settings: {
        Args: { store_id_param: string }
        Returns: Json
      }
      get_store_users: {
        Args: { input_store_id: string }
        Returns: {
          store_id: string
          user_id: string
          role_in_store: string
          permissions: Json
          assigned_at: string
          assigned_by: string
          is_active: boolean
          can_use_pin_auth: boolean
          pin_access_level: string
          pin_permissions: Json
          email: string
          created_at: string
          updated_at: string
          raw_user_meta_data: Json
        }[]
      }
      get_store_users_paginated: {
        Args: {
          input_store_id: string
          page_number?: number
          page_size?: number
          role_filter?: string
          pin_auth_filter?: boolean
        }
        Returns: {
          store_id: string
          user_id: string
          role_in_store: string
          permissions: Json
          assigned_at: string
          assigned_by: string
          is_active: boolean
          can_use_pin_auth: boolean
          pin_access_level: string
          pin_permissions: Json
          email: string
          created_at: string
          updated_at: string
          raw_user_meta_data: Json
          total_count: number
        }[]
      }
      get_stores_with_batch_counts: {
        Args: { store_ids: string[] }
        Returns: {
          store_id: string
          store_name: string
          store_code: string
          business_name: string
          address: string
          city: string
          postal_code: string
          country: string
          timezone: string
          store_type: string
          size_category: string
          default_markup_percent: number
          waste_reduction_target_percent: number
          owner_id: string
          is_active: boolean
          onboarding_completed: boolean
          created_at: string
          updated_at: string
          batch_count: number
        }[]
      }
      get_user_store_role: {
        Args: { p_user_id: string; p_store_id: string }
        Returns: {
          user_id: string
          role_in_store: string
          permissions: Json
          is_active: boolean
          can_use_pin_auth: boolean
          pin_access_level: string
          store_id: string
          store_name: string
        }[]
      }
      get_users_with_metadata: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          created_at: string
          updated_at: string
          raw_user_meta_data: Json
          username: string
          full_name: string
          is_active: boolean
          avatar_url: string
          last_login: string
          pin_hash: string
          pin_set_at: string
          pin_attempts: number
          requires_pin: boolean
          email_verified: boolean
          phone_verified: boolean
          pin_expires_at: string
          pin_locked_until: string
          pin_delivery_method: string
          migrated_from_user_mgmt: boolean
          phone: string
          language_preference: string
        }[]
      }
      invite_user_to_store: {
        Args: {
          p_user_email: string
          p_store_id: string
          p_role_in_store?: string
          p_permissions?: Json
        }
        Returns: Json
      }
      reset_pin_attempts: {
        Args: { p_user_id: string }
        Returns: Json
      }
      reset_user_pin: {
        Args: { p_user_id: string } | { p_user_id: string; p_new_pin: string }
        Returns: Json
      }
      resolve_bulk_products: {
        Args: { p_skus: string[]; p_barcodes: string[]; p_names: string[] }
        Returns: {
          input_index: number
          product_id: string
          found_method: string
          sku: string
          name: string
        }[]
      }
      resolve_bulk_products_simple: {
        Args: { p_skus: string[]; p_barcodes: string[]; p_names: string[] }
        Returns: {
          input_index: number
          product_id: string
          found_method: string
        }[]
      }
      security_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_issues: number
          rls_issues: number
          function_issues: number
          compliance_status: string
        }[]
      }
      simple_update_store_user_test: {
        Args: {
          input_store_id: string
          input_user_id: string
          input_can_use_pin_auth: boolean
        }
        Returns: string
      }
      test_business_schema_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_count: number
          store_count: number
        }[]
      }
      test_csv_performance: {
        Args: { p_store_id: string; p_item_count: number }
        Returns: {
          operation_type: string
          duration_ms: number
          item_count: number
          items_per_second: number
        }[]
      }
      unlock_user_pin: {
        Args: { p_user_id: string }
        Returns: Json
      }
      update_store_settings: {
        Args: {
          store_id_param: string
          store_name_param?: string
          business_name_param?: string
          store_code_param?: string
          store_type_param?: string
          size_category_param?: string
          address_param?: string
          city_param?: string
          postal_code_param?: string
          country_param?: string
          phone_param?: string
          email_param?: string
          website_url_param?: string
          description_param?: string
          default_markup_percent_param?: number
          waste_reduction_target_percent_param?: number
        }
        Returns: Json
      }
      update_store_user_safe: {
        Args: {
          input_store_id: string
          input_user_id: string
          input_role_in_store?: string
          input_permissions?: Json
          input_is_active?: boolean
          input_can_use_pin_auth?: boolean
          input_pin_access_level?: string
          input_pin_permissions?: Json
        }
        Returns: {
          store_id: string
          user_id: string
          role_in_store: string
          permissions: Json
          assigned_at: string
          assigned_by: string
          is_active: boolean
          can_use_pin_auth: boolean
          pin_access_level: string
          pin_permissions: Json
          email: string
          created_at: string
          updated_at: string
          raw_user_meta_data: Json
        }[]
      }
      update_user_email: {
        Args: { target_user_id: string; new_email: string }
        Returns: Json
      }
      update_user_language_preference: {
        Args: { target_user_id: string; new_language_preference: string }
        Returns: Json
      }
      update_user_metadata: {
        Args: { target_user_id: string; metadata_updates: Json }
        Returns: Json
      }
      update_user_phone: {
        Args: { target_user_id: string; new_phone: string }
        Returns: Json
      }
      update_user_pin: {
        Args: { p_user_id: string; p_new_pin: string }
        Returns: Json
      }
      user_has_pin_access: {
        Args: { target_store_id: string }
        Returns: boolean
      }
      user_has_store_access: {
        Args: { target_store_id: string; required_role?: string }
        Returns: boolean
      }
      validate_pin_login: {
        Args: { p_username: string; p_pin: string }
        Returns: Json
      }
    }
    Enums: {
      action_type: 'discount' | 'donate' | 'dispose' | 'maintain' | 'ignored'
      donation_recipient_type:
        | 'food_bank'
        | 'soup_kitchen'
        | 'charity'
        | 'religious_org'
        | 'community_group'
        | 'animal_shelter'
        | 'school'
        | 'elderly_care'
        | 'homeless_shelter'
        | 'other'
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
          composite_score: number | null
          confidence_level: number | null
          expiry_score: number | null
          margin_score: number | null
          ml_enhanced: boolean | null
          recommendation: string | null
          score_id: string
          store_id: string | null
          velocity_score: number | null
        }
        Insert: {
          batch_id?: string | null
          calculated_at?: string | null
          composite_score?: number | null
          confidence_level?: number | null
          expiry_score?: number | null
          margin_score?: number | null
          ml_enhanced?: boolean | null
          recommendation?: string | null
          score_id?: string
          store_id?: string | null
          velocity_score?: number | null
        }
        Update: {
          batch_id?: string | null
          calculated_at?: string | null
          composite_score?: number | null
          confidence_level?: number | null
          expiry_score?: number | null
          margin_score?: number | null
          ml_enhanced?: boolean | null
          recommendation?: string | null
          score_id?: string
          store_id?: string | null
          velocity_score?: number | null
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
      pin_deliveries: {
        Row: {
          created_at: string | null
          delivered_by: string | null
          delivery_address: string | null
          delivery_confirmed_at: string | null
          delivery_id: string
          delivery_method: string
          delivery_requested_at: string | null
          delivery_sent_at: string | null
          delivery_status: string | null
          expires_at: string | null
          external_message_id: string | null
          max_attempts: number | null
          notes: string | null
          pin_format: string | null
          pin_length: number | null
          pin_reference: string | null
          store_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_by?: string | null
          delivery_address?: string | null
          delivery_confirmed_at?: string | null
          delivery_id?: string
          delivery_method: string
          delivery_requested_at?: string | null
          delivery_sent_at?: string | null
          delivery_status?: string | null
          expires_at?: string | null
          external_message_id?: string | null
          max_attempts?: number | null
          notes?: string | null
          pin_format?: string | null
          pin_length?: number | null
          pin_reference?: string | null
          store_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivered_by?: string | null
          delivery_address?: string | null
          delivery_confirmed_at?: string | null
          delivery_id?: string
          delivery_method?: string
          delivery_requested_at?: string | null
          delivery_sent_at?: string | null
          delivery_status?: string | null
          expires_at?: string | null
          external_message_id?: string | null
          max_attempts?: number | null
          notes?: string | null
          pin_format?: string | null
          pin_length?: number | null
          pin_reference?: string | null
          store_id?: string | null
          updated_at?: string | null
          user_id?: string
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
            foreignKeyName: 'user_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['role_id']
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
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          is_active?: boolean | null
          password_hash?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          is_active?: boolean | null
          password_hash?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      users_backup_before_cleanup: {
        Row: {
          avatar_url: string | null
          backup_created_at: string | null
          backup_reason: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          is_active: boolean | null
          last_login: string | null
          password_hash: string | null
          pin_attempts: number | null
          pin_delivery_method: string | null
          pin_expires_at: string | null
          pin_hash: string | null
          pin_locked_until: string | null
          pin_set_at: string | null
          requires_pin: boolean | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          backup_created_at?: string | null
          backup_reason?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string | null
          pin_attempts?: number | null
          pin_delivery_method?: string | null
          pin_expires_at?: string | null
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          requires_pin?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          backup_created_at?: string | null
          backup_reason?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string | null
          pin_attempts?: number | null
          pin_delivery_method?: string | null
          pin_expires_at?: string | null
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          requires_pin?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { user_uuid?: string }
        Returns: string[]
      }
      has_role: {
        Args: { role_name: string; user_uuid?: string }
        Returns: boolean
      }
      has_role_cached: {
        Args: { role_name: string; user_uuid: string }
        Returns: boolean
      }
      user_can_access_store: {
        Args: { store_uuid: string }
        Returns: boolean
      }
      user_is_store_manager: {
        Args: { store_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  analytics: {
    Enums: {},
  },
  business: {
    Enums: {
      store_type_enum: ['supermarket', 'convenience', 'restaurant', 'bakery', 'butcher', 'organic'],
    },
  },
  inventory: {
    Enums: {},
  },
  public: {
    Enums: {
      action_type: ['discount', 'donate', 'dispose', 'maintain', 'ignored'],
      donation_recipient_type: [
        'food_bank',
        'soup_kitchen',
        'charity',
        'religious_org',
        'community_group',
        'animal_shelter',
        'school',
        'elderly_care',
        'homeless_shelter',
        'other',
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
