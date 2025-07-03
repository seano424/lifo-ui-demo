// types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  business: {
    Tables: {
      store_settings: {
        Row: {
          critical_threshold: number | null
          currency: string | null
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
          critical_threshold?: number | null
          currency?: string | null
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
          critical_threshold?: number | null
          currency?: string | null
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
          is_active: boolean | null
          permissions: Json | null
          role_in_store: string | null
          store_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          role_in_store?: string | null
          store_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          role_in_store?: string | null
          store_id?: string
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
          created_at: string | null
          default_markup_percent: number | null
          is_active: boolean | null
          onboarding_completed: boolean | null
          owner_id: string | null
          postal_code: string | null
          size_category: string | null
          store_code: string
          store_id: string
          store_name: string
          store_type: string | null
          timezone: string | null
          updated_at: string | null
          waste_reduction_target_percent: number | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_markup_percent?: number | null
          is_active?: boolean | null
          onboarding_completed?: boolean | null
          owner_id?: string | null
          postal_code?: string | null
          size_category?: string | null
          store_code: string
          store_id?: string
          store_name: string
          store_type?: string | null
          timezone?: string | null
          updated_at?: string | null
          waste_reduction_target_percent?: number | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_markup_percent?: number | null
          is_active?: boolean | null
          onboarding_completed?: boolean | null
          owner_id?: string | null
          postal_code?: string | null
          size_category?: string | null
          store_code?: string
          store_id?: string
          store_name?: string
          store_type?: string | null
          timezone?: string | null
          updated_at?: string | null
          waste_reduction_target_percent?: number | null
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
  inventory: {
    Tables: {
      batches: {
        Row: {
          available_quantity: number | null
          batch_id: string
          batch_number: string
          cost_price: number
          created_at: string | null
          created_by: string | null
          current_quantity: number
          expiry_date: string
          initial_quantity: number
          location_code: string | null
          manufacture_date: string
          product_id: string
          received_date: string | null
          reserved_quantity: number | null
          selling_price: number
          status: string | null
          store_id: string | null
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          available_quantity?: number | null
          batch_id?: string
          batch_number: string
          cost_price: number
          created_at?: string | null
          created_by?: string | null
          current_quantity: number
          expiry_date: string
          initial_quantity: number
          location_code?: string | null
          manufacture_date: string
          product_id: string
          received_date?: string | null
          reserved_quantity?: number | null
          selling_price: number
          status?: string | null
          store_id?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          available_quantity?: number | null
          batch_id?: string
          batch_number?: string
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number
          expiry_date?: string
          initial_quantity?: number
          location_code?: string | null
          manufacture_date?: string
          product_id?: string
          received_date?: string | null
          reserved_quantity?: number | null
          selling_price?: number
          status?: string | null
          store_id?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "expiring_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          active_batches_count: number | null
          avg_days_to_expiry: number | null
          base_cost_price: number
          base_selling_price: number
          brand: string | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          name: string
          product_id: string
          sku: string
          store_id: string | null
          total_stock: number | null
          typical_shelf_life_days: number
          unit_type: string
          updated_at: string | null
        }
        Insert: {
          active_batches_count?: number | null
          avg_days_to_expiry?: number | null
          base_cost_price: number
          base_selling_price: number
          brand?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          name: string
          product_id?: string
          sku: string
          store_id?: string | null
          total_stock?: number | null
          typical_shelf_life_days: number
          unit_type: string
          updated_at?: string | null
        }
        Update: {
          active_batches_count?: number | null
          avg_days_to_expiry?: number | null
          base_cost_price?: number
          base_selling_price?: number
          brand?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          name?: string
          product_id?: string
          sku?: string
          store_id?: string | null
          total_stock?: number | null
          typical_shelf_life_days?: number
          unit_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
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
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "expiring_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
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
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_has_store_access: {
        Args: { target_store_id: string; required_role?: string }
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
  user_mgmt: {
    Tables: {
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
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          is_active: boolean | null
          last_login: string | null
          password_hash: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          is_active?: boolean | null
          last_login?: string | null
          password_hash: string
          updated_at?: string | null
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string
          updated_at?: string | null
          user_id?: string
          username?: string
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
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  business: {
    Enums: {},
  },
  inventory: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  scoring: {
    Enums: {},
  },
  user_mgmt: {
    Enums: {},
  },
} as const
