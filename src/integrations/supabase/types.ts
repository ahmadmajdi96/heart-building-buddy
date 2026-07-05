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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          case_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          org_id: string | null
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          case_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          case_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      case_members: {
        Row: {
          added_by: string | null
          case_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          case_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          case_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_members_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          body: string
          case_id: string
          created_at: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          body: string
          case_id: string
          created_at?: string
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_parties: {
        Row: {
          case_id: string
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          case_id: string
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_parties_case_id_fkey"
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
          court_room: string | null
          created_at: string
          description: string | null
          id: string
          judge: string | null
          jurisdiction: string | null
          opened_at: string
          opposing_counsel: string | null
          opposing_party: string | null
          owner_id: string
          priority: string | null
          responsible_lawyer: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          case_number?: string | null
          client_id?: string | null
          court?: string | null
          court_room?: string | null
          created_at?: string
          description?: string | null
          id?: string
          judge?: string | null
          jurisdiction?: string | null
          opened_at?: string
          opposing_counsel?: string | null
          opposing_party?: string | null
          owner_id: string
          priority?: string | null
          responsible_lawyer?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          case_number?: string | null
          client_id?: string | null
          court?: string | null
          court_room?: string | null
          created_at?: string
          description?: string | null
          id?: string
          judge?: string | null
          jurisdiction?: string | null
          opened_at?: string
          opposing_counsel?: string | null
          opposing_party?: string | null
          owner_id?: string
          priority?: string | null
          responsible_lawyer?: string | null
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
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          national_id: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          status: string
          tax_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          national_id?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          status?: string
          tax_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          national_id?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          status?: string
          tax_id?: string | null
          type?: string
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
      deadlines: {
        Row: {
          assigned_to: string | null
          case_id: string | null
          completed_at: string | null
          completed_by: string | null
          court: string | null
          created_at: string
          description: string | null
          due_at: string
          id: string
          kind: string
          location: string | null
          org_id: string | null
          owner_id: string
          reminder_days: number[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          court?: string | null
          created_at?: string
          description?: string | null
          due_at: string
          id?: string
          kind?: string
          location?: string | null
          org_id?: string | null
          owner_id: string
          reminder_days?: number[]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          court?: string | null
          created_at?: string
          description?: string | null
          due_at?: string
          id?: string
          kind?: string
          location?: string | null
          org_id?: string | null
          owner_id?: string
          reminder_days?: number[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_case_assignees: {
        Row: {
          case_id: string
          created_at: string
          notify_sms: boolean
          phone: string | null
          role: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          notify_sms?: boolean
          phone?: string | null
          role?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          notify_sms?: boolean
          phone?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_case_assignees_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "debt_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_case_payers: {
        Row: {
          amount_due: number
          amount_paid: number
          case_id: string
          client_id: string | null
          created_at: string
          due_date: string | null
          email: string | null
          id: string
          last_reminder_kind:
            | Database["public"]["Enums"]["debt_sms_kind"]
            | null
          last_reminder_sent_at: string | null
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["debt_payer_status"]
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          case_id: string
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          email?: string | null
          id?: string
          last_reminder_kind?:
            | Database["public"]["Enums"]["debt_sms_kind"]
            | null
          last_reminder_sent_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["debt_payer_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          case_id?: string
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          email?: string | null
          id?: string
          last_reminder_kind?:
            | Database["public"]["Enums"]["debt_sms_kind"]
            | null
          last_reminder_sent_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["debt_payer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_case_payers_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "debt_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_case_payers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_cases: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          currency: string
          debt_type: Database["public"]["Enums"]["debt_type"]
          description: string | null
          due_date: string | null
          forwarder_contact: string | null
          forwarder_name: string | null
          id: string
          org_id: string
          reference: string | null
          service_fee_type: string
          service_fee_value: number
          status: Database["public"]["Enums"]["debt_case_status"]
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          debt_type?: Database["public"]["Enums"]["debt_type"]
          description?: string | null
          due_date?: string | null
          forwarder_contact?: string | null
          forwarder_name?: string | null
          id?: string
          org_id: string
          reference?: string | null
          service_fee_type?: string
          service_fee_value?: number
          status?: Database["public"]["Enums"]["debt_case_status"]
          title: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          debt_type?: Database["public"]["Enums"]["debt_type"]
          description?: string | null
          due_date?: string | null
          forwarder_contact?: string | null
          forwarder_name?: string | null
          id?: string
          org_id?: string
          reference?: string | null
          service_fee_type?: string
          service_fee_value?: number
          status?: Database["public"]["Enums"]["debt_case_status"]
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_cases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_collection_payments: {
        Row: {
          amount_forwarded: number
          amount_received: number
          case_id: string
          created_at: string
          created_by: string
          currency: string
          forwarder_name: string | null
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          org_id: string
          paid_at: string
          payer_id: string | null
          reference: string | null
          service_fee: number
          updated_at: string
        }
        Insert: {
          amount_forwarded?: number
          amount_received?: number
          case_id: string
          created_at?: string
          created_by: string
          currency?: string
          forwarder_name?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          org_id: string
          paid_at?: string
          payer_id?: string | null
          reference?: string | null
          service_fee?: number
          updated_at?: string
        }
        Update: {
          amount_forwarded?: number
          amount_received?: number
          case_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          forwarder_name?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          org_id?: string
          paid_at?: string
          payer_id?: string | null
          reference?: string | null
          service_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_collection_payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "debt_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_collection_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tax_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_collection_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_collection_payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "debt_case_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_reminder_rules: {
        Row: {
          active: boolean
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string
          message_template: string
          offset_days: number
          org_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          case_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label: string
          message_template: string
          offset_days?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          case_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string
          message_template?: string
          offset_days?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_reminder_rules_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "debt_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_reminder_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_sms_log: {
        Row: {
          assignee_user_id: string | null
          case_id: string | null
          error: string | null
          id: string
          kind: Database["public"]["Enums"]["debt_sms_kind"]
          message: string
          org_id: string
          payer_id: string | null
          phone: string
          sent_at: string
          status: string
          twilio_sid: string | null
        }
        Insert: {
          assignee_user_id?: string | null
          case_id?: string | null
          error?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["debt_sms_kind"]
          message: string
          org_id: string
          payer_id?: string | null
          phone: string
          sent_at?: string
          status?: string
          twilio_sid?: string | null
        }
        Update: {
          assignee_user_id?: string | null
          case_id?: string | null
          error?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["debt_sms_kind"]
          message?: string
          org_id?: string
          payer_id?: string | null
          phone?: string
          sent_at?: string
          status?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_sms_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "debt_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_sms_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_sms_log_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "debt_case_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          access_count: number
          created_at: string
          created_by: string | null
          document_id: string
          expires_at: string | null
          id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          document_id: string
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          document_id?: string
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          id: string
          mime_type: string | null
          note: string | null
          size: number | null
          storage_path: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          mime_type?: string | null
          note?: string | null
          size?: number | null
          storage_path: string
          uploaded_by?: string | null
          version: number
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          mime_type?: string | null
          note?: string | null
          size?: number | null
          storage_path?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          current_version: number
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
          category?: string | null
          client_id?: string | null
          created_at?: string
          current_version?: number
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
          category?: string | null
          client_id?: string | null
          created_at?: string
          current_version?: number
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
      draft_invoices: {
        Row: {
          accepted_at: string | null
          accepted_invoice_id: string | null
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
          number: string | null
          org_id: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          time_entry_ids: string[]
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_invoice_id?: string | null
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
          number?: string | null
          org_id: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          time_entry_ids?: string[]
          total?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_invoice_id?: string | null
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
          number?: string | null
          org_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          time_entry_ids?: string[]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_invoices_accepted_invoice_id_fkey"
            columns: ["accepted_invoice_id"]
            isOneToOne: false
            referencedRelation: "tax_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      live_sessions: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          language: string
          owner_id: string
          started_at: string
          status: string
          title: string
          transcript: string
          turns: Json
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          language?: string
          owner_id: string
          started_at?: string
          status?: string
          title?: string
          transcript?: string
          turns?: Json
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          language?: string
          owner_id?: string
          started_at?: string
          status?: string
          title?: string
          transcript?: string
          turns?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          owner_id: string
          participants: Json | null
          room_name: string
          started_at: string
          title: string
          transcript: string | null
          turns: Json | null
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          owner_id: string
          participants?: Json | null
          room_name: string
          started_at?: string
          title?: string
          transcript?: string | null
          turns?: Json | null
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          owner_id?: string
          participants?: Json | null
          room_name?: string
          started_at?: string
          title?: string
          transcript?: string | null
          turns?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          link: string | null
          org_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: string
          link?: string | null
          org_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          link?: string | null
          org_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          country: string | null
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
          preferred_language: string
          quote_prefix: string
          tax_id: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          country?: string | null
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
          preferred_language?: string
          quote_prefix?: string
          tax_id?: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          country?: string | null
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
          preferred_language?: string
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
          debt_case_id: string | null
          description: string | null
          due_date: string
          id: string
          installment_count: number | null
          installment_no: number | null
          invoice_id: string | null
          org_id: string
          plan_id: string | null
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
          debt_case_id?: string | null
          description?: string | null
          due_date: string
          id?: string
          installment_count?: number | null
          installment_no?: number | null
          invoice_id?: string | null
          org_id: string
          plan_id?: string | null
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
          debt_case_id?: string | null
          description?: string | null
          due_date?: string
          id?: string
          installment_count?: number | null
          installment_no?: number | null
          invoice_id?: string | null
          org_id?: string
          plan_id?: string | null
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
            foreignKeyName: "payment_schedules_debt_case_id_fkey"
            columns: ["debt_case_id"]
            isOneToOne: false
            referencedRelation: "debt_cases"
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
          schedule_id: string | null
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
          schedule_id?: string | null
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
          schedule_id?: string | null
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
          {
            foreignKeyName: "payments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedules"
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
      time_entries: {
        Row: {
          activity_type: string
          billable: boolean
          case_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          description: string
          duration_seconds: number
          ended_at: string | null
          hourly_rate: number | null
          id: string
          invoice_id: string | null
          is_running: boolean
          owner_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          billable?: boolean
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          duration_seconds?: number
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          invoice_id?: string | null
          is_running?: boolean
          owner_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          billable?: boolean
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          duration_seconds?: number
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          invoice_id?: string | null
          is_running?: boolean
          owner_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tax_invoices"
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
      is_case_member: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_case_owner: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      mark_invoices_overdue: { Args: never; Returns: undefined }
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
      debt_case_status: "active" | "paid" | "partial" | "overdue" | "cancelled"
      debt_payer_status:
        | "pending"
        | "partial"
        | "paid"
        | "overdue"
        | "cancelled"
      debt_sms_kind:
        | "reminder_upcoming"
        | "reminder_due"
        | "reminder_overdue"
        | "assignment"
        | "manual"
      debt_type: "rent" | "loan" | "service" | "installment" | "other"
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
      schedule_status:
        | "upcoming"
        | "due"
        | "paid"
        | "overdue"
        | "cancelled"
        | "paused"
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
      debt_case_status: ["active", "paid", "partial", "overdue", "cancelled"],
      debt_payer_status: ["pending", "partial", "paid", "overdue", "cancelled"],
      debt_sms_kind: [
        "reminder_upcoming",
        "reminder_due",
        "reminder_overdue",
        "assignment",
        "manual",
      ],
      debt_type: ["rent", "loan", "service", "installment", "other"],
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
      schedule_status: [
        "upcoming",
        "due",
        "paid",
        "overdue",
        "cancelled",
        "paused",
      ],
    },
  },
} as const
