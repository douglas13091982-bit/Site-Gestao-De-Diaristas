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
          is_public: boolean
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
          is_public?: boolean
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
          is_public?: boolean
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
          professional_id: string
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: number
          created_at?: string
          id?: number
          notified_at?: string | null
          professional_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: number
          created_at?: string
          id?: number
          notified_at?: string | null
          professional_id?: string
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
            referencedRelation: "profiles"
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
          city_slug: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          duration_hours: number | null
          guest_token: string
          id: number
          mp_payment_id: string | null
          notes: string | null
          paid_at: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_pix_code: string | null
          payment_provider_id: string | null
          payment_qr_base64: string | null
          payment_status: string | null
          professional_id: string | null
          property_type: string | null
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
          city_slug?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          duration_hours?: number | null
          guest_token?: string
          id?: number
          mp_payment_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_pix_code?: string | null
          payment_provider_id?: string | null
          payment_qr_base64?: string | null
          payment_status?: string | null
          professional_id?: string | null
          property_type?: string | null
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
          city_slug?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          duration_hours?: number | null
          guest_token?: string
          id?: number
          mp_payment_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_pix_code?: string | null
          payment_provider_id?: string | null
          payment_qr_base64?: string | null
          payment_status?: string | null
          professional_id?: string | null
          property_type?: string | null
          rooms?: number | null
          service_type?: string | null
          start_time?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          mp_payment_id: string | null
          pix_code: string | null
          professional_id: string
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
          mp_payment_id?: string | null
          pix_code?: string | null
          professional_id: string
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
          mp_payment_id?: string | null
          pix_code?: string | null
          professional_id?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: number
          image_url: string | null
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          image_url?: string | null
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          image_url?: string | null
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          handled_at: string | null
          handled_by: string | null
          id: number
          is_professional: boolean
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: number
          is_professional?: boolean
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: number
          is_professional?: boolean
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          max_hourly_rate: number | null
          min_hourly_rate: number | null
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
          max_hourly_rate?: number | null
          min_hourly_rate?: number | null
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
          max_hourly_rate?: number | null
          min_hourly_rate?: number | null
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
          professional_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: number
          is_available?: boolean
          professional_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: number
          is_available?: boolean
          professional_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: number
          professional_id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: number
          professional_id: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: number
          professional_id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_blocked_dates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          bio: string | null
          city: string | null
          city_slug: string | null
          cpf: string | null
          created_at: string
          credits_balance: number
          email: string | null
          experience: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          is_available: boolean
          is_professional: boolean
          is_verified: boolean
          neighborhoods: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          profession_category: string | null
          profile_photo: string | null
          property_type: string | null
          rating: number
          regions: string | null
          specialties: string[]
          suspended_until: string | null
          total_bookings: number
          total_reviews: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          bio?: string | null
          city?: string | null
          city_slug?: string | null
          cpf?: string | null
          created_at?: string
          credits_balance?: number
          email?: string | null
          experience?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id: string
          is_available?: boolean
          is_professional?: boolean
          is_verified?: boolean
          neighborhoods?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profession_category?: string | null
          profile_photo?: string | null
          property_type?: string | null
          rating?: number
          regions?: string | null
          specialties?: string[]
          suspended_until?: string | null
          total_bookings?: number
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          bio?: string | null
          city?: string | null
          city_slug?: string | null
          cpf?: string | null
          created_at?: string
          credits_balance?: number
          email?: string | null
          experience?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean
          is_professional?: boolean
          is_verified?: boolean
          neighborhoods?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profession_category?: string | null
          profile_photo?: string | null
          property_type?: string | null
          rating?: number
          regions?: string | null
          specialties?: string[]
          suspended_until?: string | null
          total_bookings?: number
          total_reviews?: number
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
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: number
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: number
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: number | null
          client_email: string | null
          client_id: string | null
          comment: string | null
          created_at: string
          id: number
          professional_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          booking_id?: number | null
          client_email?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string
          id?: number
          professional_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          booking_id?: number | null
          client_email?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string
          id?: number
          professional_id?: string
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
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string | null
          external_id: string | null
          headers: Json | null
          http_status: number | null
          id: string
          payload: Json | null
          provider: string
          signature_valid: boolean
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          headers?: Json | null
          http_status?: number | null
          id?: string
          payload?: Json | null
          provider: string
          signature_valid?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          headers?: Json | null
          http_status?: number | null
          id?: string
          payload?: Json | null
          provider?: string
          signature_valid?: boolean
          status?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: number
          notes: string | null
          pix_key: string
          pix_key_type: string | null
          processed_at: string | null
          processed_by: string | null
          professional_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: number
          notes?: string | null
          pix_key: string
          pix_key_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          professional_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: number
          notes?: string | null
          pix_key?: string
          pix_key_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          professional_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_reviews: {
        Row: {
          booking_id: number | null
          comment: string | null
          created_at: string | null
          id: number | null
          professional_id: string | null
          rating: number | null
        }
        Insert: {
          booking_id?: number | null
          comment?: string | null
          created_at?: string | null
          id?: number | null
          professional_id?: string | null
          rating?: number | null
        }
        Update: {
          booking_id?: number | null
          comment?: string | null
          created_at?: string | null
          id?: number | null
          professional_id?: string | null
          rating?: number | null
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_public_professional: {
        Args: { _id: string }
        Returns: {
          bio: string
          city: string
          city_slug: string
          experience: string
          full_name: string
          hourly_rate: number
          id: string
          is_available: boolean
          is_verified: boolean
          neighborhoods: string
          profession_category: string
          profile_photo: string
          rating: number
          regions: string
          specialties: string[]
          total_bookings: number
          total_reviews: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_public_professionals: {
        Args: {
          _category?: string
          _city_slug?: string
          _limit?: number
          _search?: string
        }
        Returns: {
          bio: string
          city: string
          city_slug: string
          experience: string
          full_name: string
          hourly_rate: number
          id: string
          is_available: boolean
          is_verified: boolean
          neighborhoods: string
          profession_category: string
          profile_photo: string
          rating: number
          regions: string
          specialties: string[]
          total_bookings: number
          total_reviews: number
        }[]
      }
      recalc_professional_rating: { Args: { _pro: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "professional" | "client"
      booking_status:
        | "requested"
        | "confirmed"
        | "in_progress"
        | "awaiting_client_confirmation"
        | "completed"
        | "reviewed"
        | "cancelled"
      transaction_status:
        | "pending"
        | "paid"
        | "released"
        | "refunded"
        | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      booking_status: [
        "requested",
        "confirmed",
        "in_progress",
        "awaiting_client_confirmation",
        "completed",
        "reviewed",
        "cancelled",
      ],
      transaction_status: ["pending", "paid", "released", "refunded", "failed"],
    },
  },
} as const
