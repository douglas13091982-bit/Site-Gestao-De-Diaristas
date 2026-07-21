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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: number
          setting_group: string
          setting_key: string
          setting_label: string | null
          setting_type: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          setting_group?: string
          setting_key: string
          setting_label?: string | null
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          setting_group?: string
          setting_key?: string
          setting_label?: string | null
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      available_cities: {
        Row: {
          created_at: string
          display_order: number
          id: number
          is_enabled: boolean
          name: string
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: number
          is_enabled?: boolean
          name: string
          slug: string
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: number
          is_enabled?: boolean
          name?: string
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      blocked_emails: {
        Row: {
          blocked_by: string | null
          created_at: string
          email: string
          id: number
          reason: string | null
          updated_at: string
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          email: string
          id?: number
          reason?: string | null
          updated_at?: string
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          email?: string
          id?: number
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      booking_offers: {
        Row: {
          booking_id: number
          created_at: string
          id: number
          notified_at: string | null
          professional_id: number
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: number
          created_at?: string
          id?: number
          notified_at?: string | null
          professional_id: number
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: number
          created_at?: string
          id?: number
          notified_at?: string | null
          professional_id?: number
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_offers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_offers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string | null
          address_complement: string | null
          bathrooms: number | null
          booking_date: string | null
          booking_type: string
          city: string | null
          client_email: string | null
          client_user_id: string | null
          created_at: string
          duration_hours: number | null
          id: number
          mp_payment_id: string | null
          notes: string | null
          payment_amount: number | null
          payment_method: string
          payment_pix_code: string | null
          payment_status: string
          professional_id: number | null
          rooms: number | null
          service_type: string | null
          start_time: string | null
          status: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          bathrooms?: number | null
          booking_date?: string | null
          booking_type?: string
          city?: string | null
          client_email?: string | null
          client_user_id?: string | null
          created_at?: string
          duration_hours?: number | null
          id?: number
          mp_payment_id?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string
          payment_pix_code?: string | null
          payment_status?: string
          professional_id?: number | null
          rooms?: number | null
          service_type?: string | null
          start_time?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          bathrooms?: number | null
          booking_date?: string | null
          booking_type?: string
          city?: string | null
          client_email?: string | null
          client_user_id?: string | null
          created_at?: string
          duration_hours?: number | null
          id?: number
          mp_payment_id?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string
          payment_pix_code?: string | null
          payment_status?: string
          professional_id?: number | null
          rooms?: number | null
          service_type?: string | null
          start_time?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      category_specialties: {
        Row: {
          category_id: number
          created_at: string
          display_order: number
          id: number
          is_enabled: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_id: number
          created_at?: string
          display_order?: number
          id?: number
          is_enabled?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: number
          created_at?: string
          display_order?: number
          id?: number
          is_enabled?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_specialties_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "profession_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          booking_id: number | null
          created_at: string
          description: string | null
          id: number
          pix_code: string | null
          professional_id: number
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          pix_code?: string | null
          professional_id: number
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          pix_code?: string | null
          professional_id?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_packages: {
        Row: {
          created_at: string
          display_order: number
          duration_hours: number
          id: number
          is_enabled: boolean
          price: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          duration_hours: number
          id?: number
          is_enabled?: boolean
          price: number
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          duration_hours?: number
          id?: number
          is_enabled?: boolean
          price?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      profession_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: number
          is_enabled: boolean
          max_hourly_rate: number
          min_hourly_rate: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: number
          is_enabled?: boolean
          max_hourly_rate?: number
          min_hourly_rate?: number
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: number
          is_enabled?: boolean
          max_hourly_rate?: number
          min_hourly_rate?: number
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: number
          is_available: boolean
          professional_id: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: number
          is_available?: boolean
          professional_id: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: number
          is_available?: boolean
          professional_id?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: number
          professional_id: number
          reason: string | null
          updated_at: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: number
          professional_id: number
          reason?: string | null
          updated_at?: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: number
          professional_id?: number
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_blocked_dates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          auth_user_id: string | null
          bio: string | null
          city: string | null
          cpf: string | null
          created_at: string
          credits_balance: number
          email: string | null
          experience: string | null
          hourly_rate: number | null
          id: number
          is_available: boolean
          is_verified: boolean
          name: string
          neighborhoods: string | null
          phone: string | null
          photo_url: string | null
          pix_key: string | null
          profession_category: string
          rating: number | null
          regions: string | null
          specialties: string | null
          total_bookings: number
          total_reviews: number
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          credits_balance?: number
          email?: string | null
          experience?: string | null
          hourly_rate?: number | null
          id?: number
          is_available?: boolean
          is_verified?: boolean
          name: string
          neighborhoods?: string | null
          phone?: string | null
          photo_url?: string | null
          pix_key?: string | null
          profession_category?: string
          rating?: number | null
          regions?: string | null
          specialties?: string | null
          total_bookings?: number
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          credits_balance?: number
          email?: string | null
          experience?: string | null
          hourly_rate?: number | null
          id?: number
          is_available?: boolean
          is_verified?: boolean
          name?: string
          neighborhoods?: string | null
          phone?: string | null
          photo_url?: string | null
          pix_key?: string | null
          profession_category?: string
          rating?: number | null
          regions?: string | null
          specialties?: string | null
          total_bookings?: number
          total_reviews?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          profile_photo: string | null
          property_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          profile_photo?: string | null
          property_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          profile_photo?: string | null
          property_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: number
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: number
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: number
          p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: number | null
          client_email: string | null
          client_user_id: string | null
          comment: string | null
          created_at: string
          id: number
          professional_id: number
          rating: number
          updated_at: string
        }
        Insert: {
          booking_id?: number | null
          client_email?: string | null
          client_user_id?: string | null
          comment?: string | null
          created_at?: string
          id?: number
          professional_id: number
          rating: number
          updated_at?: string
        }
        Update: {
          booking_id?: number | null
          client_email?: string | null
          client_user_id?: string | null
          comment?: string | null
          created_at?: string
          id?: number
          professional_id?: number
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "professional" | "client"
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
  public: {
    Enums: {
      app_role: ["admin", "professional", "client"],
    },
  },
} as const
