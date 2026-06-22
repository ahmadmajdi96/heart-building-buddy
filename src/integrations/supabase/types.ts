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
      appointments: {
        Row: {
          all_day: boolean
          case_id: string | null
          client_id: string | null
          color: string | null
          created_at: string
          description: string | null
          ends_at: string
          id: string
          kind: string
          location: string | null
          owner_id: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          case_id?: string | null
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          kind?: string
          location?: string | null
          owner_id: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          case_id?: string | null
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          kind?: string
          location?: string | null
          owner_id?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      case_events: {
        Row: {
          body: string | null
          case_id: string
          completed: boolean
          created_at: string
          id: string
          kind: string
          owner_id: string
          scheduled_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          case_id: string
          completed?: boolean
          created_at?: string
          id?: string
          kind?: string
          owner_id: string
          scheduled_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          case_id?: string
          completed?: boolean
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          scheduled_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_number: string | null
          client_id: string | null
          court: string | null
          created_at: string
          description: string | null
          id: string
          jurisdiction: string | null
          opened_at: string
          owner_id: string
          priority: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          case_number?: string | null
          client_id?: string | null
          court?: string | null
          created_at?: string
          description?: string | null
          id?: string
          jurisdiction?: string | null
          opened_at?: string
          owner_id: string
          priority?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          case_number?: string | null
          client_id?: string | null
          court?: string | null
          created_at?: string
          description?: string | null
          id?: string
          jurisdiction?: string | null
          opened_at?: string
          owner_id?: string
          priority?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          body: string | null
          client_id: string
          created_at: string
          id: string
          kind: string
          occurred_at: string
          owner_id: string
          title: string | null
        }
        Insert: {
          body?: string | null
          client_id: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          owner_id: string
          title?: string | null
        }
        Update: {
          body?: string | null
          client_id?: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          owner_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          national_id: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          national_id?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          national_id?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      courtroom_simulations: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          owner_id: string
          scenario: Json
          score: number | null
          title: string | null
          transcript: Json
          verdict: Json | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          scenario: Json
          score?: number | null
          title?: string | null
          transcript?: Json
          verdict?: Json | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          scenario?: Json
          score?: number | null
          title?: string | null
          transcript?: Json
          verdict?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "courtroom_simulations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          extracted_text: string | null
          id: string
          is_template: boolean
          mime_type: string | null
          name: string
          owner_id: string
          size: number | null
          storage_path: string
          tags: string[] | null
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          extracted_text?: string | null
          id?: string
          is_template?: boolean
          mime_type?: string | null
          name: string
          owner_id: string
          size?: number | null
          storage_path: string
          tags?: string[] | null
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          extracted_text?: string | null
          id?: string
          is_template?: boolean
          mime_type?: string | null
          name?: string
          owner_id?: string
          size?: number | null
          storage_path?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          case_id: string | null
          content: string
          created_at: string
          id: string
          owner_id: string
          template: string | null
          title: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          case_id?: string | null
          content?: string
          created_at?: string
          id?: string
          owner_id: string
          template?: string | null
          title: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          case_id?: string | null
          content?: string
          created_at?: string
          id?: string
          owner_id?: string
          template?: string | null
          title?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_email: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          currency: string
          default_tax_rate: number
          display_name: string | null
          email: string | null
          id: string
          invoice_prefix: string
          legal_name: string
          logo_path: string | null
          phone: string | null
          quote_prefix: string
          tax_id: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          currency?: string
          default_tax_rate?: number
          display_name?: string | null
          email?: string | null
          id?: string
          invoice_prefix?: string
          legal_name: string
          logo_path?: string | null
          phone?: string | null
          quote_prefix?: string
          tax_id?: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          default_tax_rate?: number
          display_name?: string | null
          email?: string | null
          id?: string
          invoice_prefix?: string
          legal_name?: string
          logo_path?: string | null
          phone?: string | null
          quote_prefix?: string
          tax_id?: string | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          amount: number
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string
          currency: string
          description: string | null
          due_date: string
          id: string
          invoice_id: string | null
          org_id: string
          reminder_sent_at: string | null
          status: Database["public"]["Enums"]["schedule_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_id?: string | null
          org_id: string
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_id?: string | null
          org_id?: string
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tax_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string
          currency: string
          id: string
          invoice_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          org_id: string
          paid_at: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          org_id: string
          paid_at?: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          org_id?: string
          paid_at?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tax_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          case_id: string | null
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string
          currency: string
          id: string
          issue_date: string
          items: Json
          notes: string | null
          number: string
          org_id: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          issue_date?: string
          items?: Json
          notes?: string | null
          number: string
          org_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          issue_date?: string
          items?: Json
          notes?: string | null
          number?: string
          org_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_invoices: {
        Row: {
          amount_paid: number
          case_id: string | null
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string
          currency: string
          due_date: string | null
          id: string
          issue_date: string
          items: Json
          notes: string | null
          number: string
          org_id: string
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          case_id?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by: string
          currency?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          items?: Json
          notes?: string | null
          number: string
          org_id: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          case_id?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string
          currency?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          items?: Json
          notes?: string | null
          number?: string
          org_id?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_org: { Args: never; Returns: string }
      has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["org_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      next_doc_number: {
        Args: { _kind: string; _org_id: string }
        Returns: string
      }
      org_role_of: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
    }
    Enums: {
      invoice_status:
        | "draft"
        | "issued"
        | "partial"
        | "paid"
        | "overdue"
        | "void"
      member_status: "active" | "invited" | "disabled"
      org_role:
        | "owner"
        | "partner"
        | "associate"
        | "paralegal"
        | "accountant"
        | "assistant"
      org_type: "solo" | "firm"
      payment_method: "cash" | "bank_transfer" | "card" | "cheque" | "other"
      quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
      schedule_status: "upcoming" | "due" | "paid" | "overdue" | "cancelled"
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
      invoice_status: ["draft", "issued", "partial", "paid", "overdue", "void"],
      member_status: ["active", "invited", "disabled"],
      org_role: [
        "owner",
        "partner",
        "associate",
        "paralegal",
        "accountant",
        "assistant",
      ],
      org_type: ["solo", "firm"],
      payment_method: ["cash", "bank_transfer", "card", "cheque", "other"],
      quote_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
      ],
      schedule_status: ["upcoming", "due", "paid", "overdue", "cancelled"],
    },
  },
} as const
