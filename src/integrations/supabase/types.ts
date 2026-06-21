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
      loja_entregadores: {
        Row: {
          ativo: boolean
          created_at: string
          entregador_id: string
          id: string
          loja_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          entregador_id: string
          id?: string
          loja_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          entregador_id?: string
          id?: string
          loja_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loja_entregadores_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          ativa: boolean
          cidade: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          horario_funcionamento: Json
          id: string
          logo_url: string | null
          nome: string
          owner_id: string
          slug: string
          taxa_entrega_base: number
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          horario_funcionamento?: Json
          id?: string
          logo_url?: string | null
          nome: string
          owner_id: string
          slug: string
          taxa_entrega_base?: number
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          horario_funcionamento?: Json
          id?: string
          logo_url?: string | null
          nome?: string
          owner_id?: string
          slug?: string
          taxa_entrega_base?: number
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          cidade: string | null
          cliente_nome: string
          cliente_telefone: string
          cliente_user_id: string | null
          complemento: string | null
          created_at: string
          endereco_coleta: string | null
          endereco_entrega: string
          entregador_id: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          itens: Json
          loja_id: string
          numero: number
          observacoes: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega: number
          troco_para: number | null
          updated_at: string
          valor_produtos: number
          valor_total: number
        }
        Insert: {
          cidade?: string | null
          cliente_nome: string
          cliente_telefone: string
          cliente_user_id?: string | null
          complemento?: string | null
          created_at?: string
          endereco_coleta?: string | null
          endereco_entrega: string
          entregador_id?: string | null
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          itens?: Json
          loja_id: string
          numero?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega?: number
          troco_para?: number | null
          updated_at?: string
          valor_produtos?: number
          valor_total?: number
        }
        Update: {
          cidade?: string | null
          cliente_nome?: string
          cliente_telefone?: string
          cliente_user_id?: string | null
          complemento?: string | null
          created_at?: string
          endereco_coleta?: string | null
          endereco_entrega?: string
          entregador_id?: string | null
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          itens?: Json
          loja_id?: string
          numero?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega?: number
          troco_para?: number | null
          updated_at?: string
          valor_produtos?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tarifas_globais: {
        Row: {
          ativa: boolean
          created_at: string
          faixa_km_max: number
          faixa_km_min: number
          id: string
          tipo_veiculo: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at: string
          valor: number
          valor_minimo: number
          valor_por_km: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          faixa_km_max: number
          faixa_km_min?: number
          id?: string
          tipo_veiculo: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at?: string
          valor: number
          valor_minimo?: number
          valor_por_km?: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          faixa_km_max?: number
          faixa_km_min?: number
          id?: string
          tipo_veiculo?: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at?: string
          valor?: number
          valor_minimo?: number
          valor_por_km?: number
        }
        Relationships: []
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
      buscar_entregador: {
        Args: { termo: string }
        Returns: {
          full_name: string
          id: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_loja_owner: {
        Args: { _loja_id: string; _user_id: string }
        Returns: boolean
      }
      listar_entregadores_loja: {
        Args: { _loja_id: string }
        Returns: {
          ativo: boolean
          created_at: string
          entregador_id: string
          full_name: string
          phone: string
          vinculo_id: string
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "loja_admin" | "entregador" | "cliente"
      forma_pagamento: "pix" | "dinheiro" | "cartao_credito" | "cartao_debito"
      pedido_status:
        | "novo"
        | "aceito"
        | "em_preparo"
        | "pronto"
        | "em_rota"
        | "coletado"
        | "entregue"
        | "cancelado"
      tipo_veiculo: "moto" | "carro" | "caminhonete"
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
      app_role: ["super_admin", "loja_admin", "entregador", "cliente"],
      forma_pagamento: ["pix", "dinheiro", "cartao_credito", "cartao_debito"],
      pedido_status: [
        "novo",
        "aceito",
        "em_preparo",
        "pronto",
        "em_rota",
        "coletado",
        "entregue",
        "cancelado",
      ],
      tipo_veiculo: ["moto", "carro", "caminhonete"],
    },
  },
} as const
