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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
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
      activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_daily_plans: {
        Row: {
          approved_at: string | null
          case_key: string
          case_severity: string
          case_summary: string | null
          case_title: string
          case_type: string
          company_id: string
          completed_at: string | null
          created_at: string
          cycle_date: string
          detected_case: Json
          dismissed_at: string | null
          executing_at: string | null
          expired_at: string | null
          generated_plan: Json
          id: string
          last_reminded_at: string | null
          metadata: Json
          next_reminder_at: string | null
          origin_fingerprint: string
          plan_summary: string
          plan_title: string
          reminder_count: number
          reviewed_at: string | null
          snapshot_base: Json
          snapshot_version: string
          source_event_ids: string[]
          source_memory_keys: string[]
          source_modules: string[]
          state: string
          state_reason: string | null
          suggested_actions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          case_key: string
          case_severity?: string
          case_summary?: string | null
          case_title: string
          case_type: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          cycle_date: string
          detected_case?: Json
          dismissed_at?: string | null
          executing_at?: string | null
          expired_at?: string | null
          generated_plan?: Json
          id?: string
          last_reminded_at?: string | null
          metadata?: Json
          next_reminder_at?: string | null
          origin_fingerprint: string
          plan_summary: string
          plan_title: string
          reminder_count?: number
          reviewed_at?: string | null
          snapshot_base?: Json
          snapshot_version?: string
          source_event_ids?: string[]
          source_memory_keys?: string[]
          source_modules?: string[]
          state?: string
          state_reason?: string | null
          suggested_actions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          case_key?: string
          case_severity?: string
          case_summary?: string | null
          case_title?: string
          case_type?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          cycle_date?: string
          detected_case?: Json
          dismissed_at?: string | null
          executing_at?: string | null
          expired_at?: string | null
          generated_plan?: Json
          id?: string
          last_reminded_at?: string | null
          metadata?: Json
          next_reminder_at?: string | null
          origin_fingerprint?: string
          plan_summary?: string
          plan_title?: string
          reminder_count?: number
          reviewed_at?: string | null
          snapshot_base?: Json
          snapshot_version?: string
          source_event_ids?: string[]
          source_memory_keys?: string[]
          source_modules?: string[]
          state?: string
          state_reason?: string | null
          suggested_actions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_daily_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_operating_context: {
        Row: {
          company_id: string
          context_json: Json
          context_version: string
          created_at: string
          cycle_date: string
          generated_at: string
          id: string
          source_fingerprint: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          context_json?: Json
          context_version?: string
          created_at?: string
          cycle_date: string
          generated_at?: string
          id?: string
          source_fingerprint: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          context_json?: Json
          context_version?: string
          created_at?: string
          cycle_date?: string
          generated_at?: string
          id?: string
          source_fingerprint?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_operating_context_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_widget_contracts: {
        Row: {
          company_id: string | null
          contract_json: Json
          created_at: string
          cycle_date: string
          error_message: string | null
          generated_by: string
          id: string
          schema_version: string
          source_context_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          contract_json?: Json
          created_at?: string
          cycle_date?: string
          error_message?: string | null
          generated_by?: string
          id?: string
          schema_version?: string
          source_context_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          contract_json?: Json
          created_at?: string
          cycle_date?: string
          error_message?: string | null
          generated_by?: string
          id?: string
          schema_version?: string
          source_context_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          metadata: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_threads: {
        Row: {
          company_id: string
          created_at: string
          id: string
          preview: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          preview?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          preview?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attention_memory: {
        Row: {
          acknowledged_at: string | null
          auto_resolved_at: string | null
          company_id: string
          created_at: string
          first_seen_at: string
          id: string
          ignored_at: string | null
          key: string
          last_seen_at: string
          last_summary: string | null
          last_title: string | null
          metadata: Json
          notified_at: string | null
          resolved_at: string | null
          snoozed_until: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          auto_resolved_at?: string | null
          company_id: string
          created_at?: string
          first_seen_at?: string
          id?: string
          ignored_at?: string | null
          key: string
          last_seen_at?: string
          last_summary?: string | null
          last_title?: string | null
          metadata?: Json
          notified_at?: string | null
          resolved_at?: string | null
          snoozed_until?: string | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          auto_resolved_at?: string | null
          company_id?: string
          created_at?: string
          first_seen_at?: string
          id?: string
          ignored_at?: string | null
          key?: string
          last_seen_at?: string
          last_summary?: string | null
          last_title?: string | null
          metadata?: Json
          notified_at?: string | null
          resolved_at?: string | null
          snoozed_until?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attention_memory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          company_id: string
          conditions: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          trigger_config: Json
          trigger_count: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          company_id: string
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          trigger_config?: Json
          trigger_count?: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          company_id?: string
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_count?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          company_id: string
          created_at: string
          description: string | null
          end_at: string | null
          id: string
          location: string | null
          metadata: Json
          related_client_id: string | null
          related_deal_id: string | null
          related_lead_id: string | null
          related_project_id: string | null
          related_task_id: string | null
          start_at: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          company_id: string
          created_at?: string
          description?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          related_client_id?: string | null
          related_deal_id?: string | null
          related_lead_id?: string | null
          related_project_id?: string | null
          related_task_id?: string | null
          start_at: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          company_id?: string
          created_at?: string
          description?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          related_client_id?: string | null
          related_deal_id?: string | null
          related_lead_id?: string | null
          related_project_id?: string | null
          related_task_id?: string | null
          start_at?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_lead_id_fkey"
            columns: ["related_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          archived_at: string | null
          author_profile_id: string | null
          client_id: string
          company_id: string
          content: string
          created_at: string
          id: string
          kind: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          author_profile_id?: string | null
          client_id: string
          company_id: string
          content: string
          created_at?: string
          id?: string
          kind?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          author_profile_id?: string | null
          client_id?: string
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_products: {
        Row: {
          billing_type: string | null
          client_id: string
          company_id: string
          created_at: string
          deal_id: string | null
          end_date: string | null
          id: string
          notes: string | null
          price: number | null
          product_id: string
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          billing_type?: string | null
          client_id: string
          company_id: string
          created_at?: string
          deal_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          product_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          billing_type?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          deal_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          product_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager: string | null
          address: string | null
          city: string | null
          company_id: string
          company_name: string
          contact_person: string | null
          country: string | null
          created_at: string
          drive_folder_id: string | null
          drive_folder_url: string | null
          email: string | null
          id: string
          industry: string | null
          notes: string | null
          phone: string | null
          status: string
          tags: string[] | null
          tax_id: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          account_manager?: string | null
          address?: string | null
          city?: string | null
          company_id: string
          company_name: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_manager?: string | null
          address?: string | null
          city?: string | null
          company_id?: string
          company_name?: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clients_account_manager"
            columns: ["account_manager"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_currency_settings: {
        Row: {
          base_currency: string
          company_id: string
          created_at: string
          rate_source: string
          rate_updated_at: string
          updated_at: string
          updated_by: string | null
          usd_to_dop_rate: number
        }
        Insert: {
          base_currency?: string
          company_id: string
          created_at?: string
          rate_source?: string
          rate_updated_at?: string
          updated_at?: string
          updated_by?: string | null
          usd_to_dop_rate?: number
        }
        Update: {
          base_currency?: string
          company_id?: string
          created_at?: string
          rate_source?: string
          rate_updated_at?: string
          updated_at?: string
          updated_by?: string | null
          usd_to_dop_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_currency_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_taxes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          rate: number
          tax_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          rate?: number
          tax_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          rate?: number
          tax_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_taxes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_whatsapp_secrets: {
        Row: {
          access_token: string | null
          access_token_configured_at: string | null
          access_token_last4: string | null
          app_secret: string | null
          app_secret_configured_at: string | null
          app_secret_last4: string | null
          company_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          access_token_configured_at?: string | null
          access_token_last4?: string | null
          app_secret?: string | null
          app_secret_configured_at?: string | null
          app_secret_last4?: string | null
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          access_token_configured_at?: string | null
          access_token_last4?: string | null
          app_secret?: string | null
          app_secret_configured_at?: string | null
          app_secret_last4?: string | null
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_whatsapp_secrets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_whatsapp_settings: {
        Row: {
          bot_api_url: string | null
          business_phone: string | null
          company_id: string
          connection_status: string
          created_at: string
          id: string
          is_connected: boolean
          last_error: string | null
          last_event_at: string | null
          last_verified_at: string | null
          meta_app_id: string | null
          meta_graph_version: string | null
          phone_number_id: string | null
          provider: string
          subscribed_fields: Json | null
          updated_at: string
          verify_token: string | null
          webhook_url: string | null
          whatsapp_business_account_id: string | null
        }
        Insert: {
          bot_api_url?: string | null
          business_phone?: string | null
          company_id: string
          connection_status?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          last_error?: string | null
          last_event_at?: string | null
          last_verified_at?: string | null
          meta_app_id?: string | null
          meta_graph_version?: string | null
          phone_number_id?: string | null
          provider?: string
          subscribed_fields?: Json | null
          updated_at?: string
          verify_token?: string | null
          webhook_url?: string | null
          whatsapp_business_account_id?: string | null
        }
        Update: {
          bot_api_url?: string | null
          business_phone?: string | null
          company_id?: string
          connection_status?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          last_error?: string | null
          last_event_at?: string | null
          last_verified_at?: string | null
          meta_app_id?: string | null
          meta_graph_version?: string | null
          phone_number_id?: string | null
          provider?: string
          subscribed_fields?: Json | null
          updated_at?: string
          verify_token?: string | null
          webhook_url?: string | null
          whatsapp_business_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_whatsapp_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          department: string | null
          email: string | null
          first_name: string
          id: string
          is_primary: boolean
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          tags: string[] | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_activity_events: {
        Row: {
          action: string
          actor_profile_id: string | null
          company_id: string
          contract_id: string
          created_at: string
          detail: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          company_id: string
          contract_id: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          company_id?: string
          contract_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_activity_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_activity_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_activity_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          metadata: Json
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          metadata?: Json
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          metadata?: Json
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          assigned_to: string | null
          base_currency: string | null
          client_id: string | null
          company_id: string
          contract_number: number
          contract_type: string
          contract_value: number | null
          contract_value_base: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          deal_id: string | null
          description: string | null
          end_date: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          id: string
          invoice_id: string | null
          metadata: Json
          project_id: string | null
          proposal_id: string | null
          signature_status: string
          signed_at: string | null
          start_date: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          base_currency?: string | null
          client_id?: string | null
          company_id: string
          contract_number?: number
          contract_type?: string
          contract_value?: number | null
          contract_value_base?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          project_id?: string | null
          proposal_id?: string | null
          signature_status?: string
          signed_at?: string | null
          start_date?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          base_currency?: string | null
          client_id?: string | null
          company_id?: string
          contract_number?: number
          contract_type?: string
          contract_value?: number | null
          contract_value_base?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          project_id?: string | null
          proposal_id?: string | null
          signature_status?: string
          signed_at?: string | null
          start_date?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          amount_base: number | null
          base_currency: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          credit_note_number: number
          currency: string | null
          date_issued: string
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_base?: number | null
          base_currency?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          credit_note_number?: number
          currency?: string | null
          date_issued?: string
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_base?: number | null
          base_currency?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          credit_note_number?: number
          currency?: string | null
          date_issued?: string
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_client_company_fkey"
            columns: ["client_id", "company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_company_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id", "company_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_company_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_products: {
        Row: {
          company_id: string
          created_at: string
          deal_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number | null
          total_price: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deal_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deal_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          assigned_to: string | null
          base_currency: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          expected_close: string | null
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          probability: number | null
          stage: string
          updated_at: string
          value: number
          value_base: number | null
        }
        Insert: {
          assigned_to?: string | null
          base_currency?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          expected_close?: string | null
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          probability?: number | null
          stage?: string
          updated_at?: string
          value?: number
          value_base?: number | null
        }
        Update: {
          assigned_to?: string | null
          base_currency?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          expected_close?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          probability?: number | null
          stage?: string
          updated_at?: string
          value?: number
          value_base?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      document_builder_documents: {
        Row: {
          content_html: string
          created_at: string
          created_by: string | null
          document_type: string
          id: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_html?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          content_html?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      drive_connections: {
        Row: {
          access_token_encrypted: string | null
          company_id: string
          connected_at: string
          expires_at: string | null
          google_email: string | null
          id: string
          refresh_token_encrypted: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          company_id: string
          connected_at?: string
          expires_at?: string | null
          google_email?: string | null
          id?: string
          refresh_token_encrypted?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          company_id?: string
          connected_at?: string
          expires_at?: string | null
          google_email?: string | null
          id?: string
          refresh_token_encrypted?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_files: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          drive_file_id: string
          file_purpose: string
          icon_link: string | null
          id: string
          linked_id: string
          linked_type: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          thumbnail_link: string | null
          web_content_link: string | null
          web_view_link: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          drive_file_id: string
          file_purpose?: string
          icon_link?: string | null
          id?: string
          linked_id: string
          linked_type: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          thumbnail_link?: string | null
          web_content_link?: string | null
          web_view_link?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          drive_file_id?: string
          file_purpose?: string
          icon_link?: string | null
          id?: string
          linked_id?: string
          linked_type?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          thumbnail_link?: string | null
          web_content_link?: string | null
          web_view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_settings: {
        Row: {
          client_id: string | null
          client_secret_encrypted: string | null
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean
          redirect_uri: string | null
          root_folder_id: string | null
          root_folder_url: string | null
          scopes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          client_secret_encrypted?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          redirect_uri?: string | null
          root_folder_id?: string | null
          root_folder_url?: string | null
          scopes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          client_secret_encrypted?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          redirect_uri?: string | null
          root_folder_id?: string | null
          root_folder_url?: string | null
          scopes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token: string | null
          company_id: string
          created_at: string
          display_name: string | null
          email: string | null
          email_address: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          provider: string | null
          refresh_token: string | null
          scopes: string[]
          settings: Json
          status: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          company_id: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_address?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: string | null
          refresh_token?: string | null
          scopes?: string[]
          settings?: Json
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          company_id?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_address?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: string | null
          refresh_token?: string | null
          scopes?: string[]
          settings?: Json
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_attachments: {
        Row: {
          company_id: string
          content_type: string | null
          created_at: string
          filename: string
          id: string
          message_id: string | null
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string
          filename: string
          id?: string
          message_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string
          filename?: string
          id?: string
          message_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_conversations: {
        Row: {
          company_id: string
          created_at: string
          email_account_id: string | null
          from_email: string | null
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          labels: string[] | null
          last_message_at: string | null
          provider: string
          provider_thread_id: string | null
          raw: Json | null
          snippet: string | null
          status: string | null
          subject: string | null
          to_email: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email_account_id?: string | null
          from_email?: string | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          labels?: string[] | null
          last_message_at?: string | null
          provider?: string
          provider_thread_id?: string | null
          raw?: Json | null
          snippet?: string | null
          status?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email_account_id?: string | null
          from_email?: string | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          labels?: string[] | null
          last_message_at?: string | null
          provider?: string
          provider_thread_id?: string | null
          raw?: Json | null
          snippet?: string | null
          status?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_conversations_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          bcc: string[] | null
          body: string | null
          body_html: string | null
          cc: string[] | null
          company_id: string
          conversation_id: string | null
          created_at: string
          direction: string | null
          email_account_id: string | null
          from_email: string | null
          id: string
          is_read: boolean | null
          label_ids: string[]
          provider: string
          provider_message_id: string | null
          provider_thread_id: string | null
          raw: Json | null
          recipient: string | null
          sender: string | null
          sent_at: string | null
          snippet: string | null
          subject: string | null
          to_email: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bcc?: string[] | null
          body?: string | null
          body_html?: string | null
          cc?: string[] | null
          company_id: string
          conversation_id?: string | null
          created_at?: string
          direction?: string | null
          email_account_id?: string | null
          from_email?: string | null
          id?: string
          is_read?: boolean | null
          label_ids?: string[]
          provider?: string
          provider_message_id?: string | null
          provider_thread_id?: string | null
          raw?: Json | null
          recipient?: string | null
          sender?: string | null
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bcc?: string[] | null
          body?: string | null
          body_html?: string | null
          cc?: string[] | null
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string | null
          email_account_id?: string | null
          from_email?: string | null
          id?: string
          is_read?: boolean | null
          label_ids?: string[]
          provider?: string
          provider_message_id?: string | null
          provider_thread_id?: string | null
          raw?: Json | null
          recipient?: string | null
          sender?: string | null
          sent_at?: string | null
          snippet?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "email_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          amount: number
          company_id: string
          converted_rate: number | null
          created_at: string
          description: string | null
          document_currency: string | null
          estimate_id: string
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          id: string
          is_optional: boolean
          item_name: string
          original_currency: string | null
          original_rate: number | null
          product_id: string | null
          quantity: number
          rate: number
          sort_order: number
          tax_amount: number
          tax_id: string | null
          tax_name: string | null
          tax_rate: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          converted_rate?: number | null
          created_at?: string
          description?: string | null
          document_currency?: string | null
          estimate_id: string
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          is_optional?: boolean
          item_name?: string
          original_currency?: string | null
          original_rate?: number | null
          product_id?: string | null
          quantity?: number
          rate?: number
          sort_order?: number
          tax_amount?: number
          tax_id?: string | null
          tax_name?: string | null
          tax_rate?: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          converted_rate?: number | null
          created_at?: string
          description?: string | null
          document_currency?: string | null
          estimate_id?: string
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          is_optional?: boolean
          item_name?: string
          original_currency?: string | null
          original_rate?: number | null
          product_id?: string | null
          quantity?: number
          rate?: number
          sort_order?: number
          tax_amount?: number
          tax_id?: string | null
          tax_name?: string | null
          tax_rate?: number
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "company_taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          adjustment: number
          base_currency: string | null
          client_id: string | null
          client_note: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          date_issued: string
          deal_id: string | null
          discount_type: string
          discount_value: number
          estimate_data: Json
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          number: number
          project_id: string | null
          quantity_mode: string
          reference: string | null
          status: string
          subtotal: number
          subtotal_base: number | null
          tags: string[]
          tax: number
          tax_amount: number
          tax_base: number | null
          tax_id: string | null
          tax_name: string | null
          tax_rate: number
          terms: string | null
          title: string
          total: number
          total_base: number | null
          updated_at: string
        }
        Insert: {
          adjustment?: number
          base_currency?: string | null
          client_id?: string | null
          client_note?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          date_issued?: string
          deal_id?: string | null
          discount_type?: string
          discount_value?: number
          estimate_data?: Json
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          number?: number
          project_id?: string | null
          quantity_mode?: string
          reference?: string | null
          status?: string
          subtotal?: number
          subtotal_base?: number | null
          tags?: string[]
          tax?: number
          tax_amount?: number
          tax_base?: number | null
          tax_id?: string | null
          tax_name?: string | null
          tax_rate?: number
          terms?: string | null
          title?: string
          total?: number
          total_base?: number | null
          updated_at?: string
        }
        Update: {
          adjustment?: number
          base_currency?: string | null
          client_id?: string | null
          client_note?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          date_issued?: string
          deal_id?: string | null
          discount_type?: string
          discount_value?: number
          estimate_data?: Json
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          number?: number
          project_id?: string | null
          quantity_mode?: string
          reference?: string | null
          status?: string
          subtotal?: number
          subtotal_base?: number | null
          tags?: string[]
          tax?: number
          tax_amount?: number
          tax_base?: number | null
          tax_id?: string | null
          tax_name?: string | null
          tax_rate?: number
          terms?: string | null
          title?: string
          total?: number
          total_base?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "company_taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          amount_base: number | null
          base_currency: string | null
          category: string
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          expense_date: string
          id: string
          notes: string | null
          project_id: string | null
          receipt_url: string | null
          status: string
          title: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          amount_base?: number | null
          base_currency?: string | null
          category?: string
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          title: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          amount_base?: number | null
          base_currency?: string | null
          category?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_company_fkey"
            columns: ["client_id", "company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_company_fkey"
            columns: ["project_id", "company_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_events: {
        Row: {
          actor_profile_id: string | null
          actor_user_id: string | null
          amount: number | null
          company_id: string
          credit_note_id: string | null
          currency: string | null
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          invoice_id: string | null
          metadata: Json
          new_status: string | null
          occurred_at: string
          payment_id: string | null
          previous_status: string | null
          transaction_id: number
        }
        Insert: {
          actor_profile_id?: string | null
          actor_user_id?: string | null
          amount?: number | null
          company_id: string
          credit_note_id?: string | null
          currency?: string | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          new_status?: string | null
          occurred_at?: string
          payment_id?: string | null
          previous_status?: string | null
          transaction_id?: number
        }
        Update: {
          actor_profile_id?: string | null
          actor_user_id?: string | null
          amount?: number | null
          company_id?: string
          credit_note_id?: string | null
          currency?: string | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json
          new_status?: string | null
          occurred_at?: string
          payment_id?: string | null
          previous_status?: string | null
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_audit_events_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_audit_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "financial_audit_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_audit_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      gemini_settings: {
        Row: {
          api_key_encrypted: string | null
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean
          model: string | null
          system_prompt: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          model?: string | null
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          model?: string | null
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gemini_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_settings: {
        Row: {
          client_id: string | null
          client_secret_encrypted: string | null
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean
          redirect_uri: string | null
          scopes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          client_secret_encrypted?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          redirect_uri?: string | null
          scopes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          client_secret_encrypted?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          redirect_uri?: string | null
          scopes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmail_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_attachments: {
        Row: {
          channel_id: string
          company_id: string
          created_at: string
          deleted_at: string | null
          expires_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          mime_type: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          channel_id: string
          company_id: string
          created_at?: string
          deleted_at?: string | null
          expires_at: string
          file_name: string
          file_size?: number
          id?: string
          message_id?: string | null
          mime_type?: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          channel_id?: string
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          expires_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          mime_type?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_attachments_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_channels: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          name: string | null
          related_id: string | null
          related_type: string | null
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string | null
          related_id?: string | null
          related_type?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string | null
          related_id?: string | null
          related_type?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_members: {
        Row: {
          channel_id: string
          company_id: string
          created_at: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted_at: string | null
          profile_id: string
          role: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          company_id: string
          created_at?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted_at?: string | null
          profile_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          company_id?: string
          created_at?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted_at?: string | null
          profile_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_message_receipts: {
        Row: {
          channel_id: string
          company_id: string
          created_at: string
          delivered_at: string | null
          id: string
          message_id: string
          profile_id: string
          read_at: string | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          company_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          message_id: string
          profile_id: string
          read_at?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          message_id?: string
          profile_id?: string
          read_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_message_receipts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_message_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_message_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_message_receipts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_messages: {
        Row: {
          body: string
          channel_id: string
          company_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string
          metadata: Json
          reply_to_id: string | null
          sender_profile_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel_id: string
          company_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          reply_to_id?: string | null
          sender_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel_id?: string
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          reply_to_id?: string | null
          sender_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_presence: {
        Row: {
          active_channel_id: string | null
          company_id: string
          created_at: string
          id: string
          last_seen_at: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          active_channel_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          last_seen_at?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          active_channel_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_presence_active_channel_id_fkey"
            columns: ["active_channel_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_presence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_reads: {
        Row: {
          channel_id: string
          company_id: string
          created_at: string
          id: string
          last_read_at: string
          last_read_message_id: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          company_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          company_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_reads_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_reads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_reads_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "internal_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          company_id: string
          created_at: string
          department: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          company_id: string
          converted_unit_price: number | null
          created_at: string
          description: string
          document_currency: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          id: string
          invoice_id: string
          is_optional: boolean
          item_name: string | null
          original_currency: string | null
          original_unit_price: number | null
          product_id: string | null
          quantity: number
          sort_order: number | null
          tax_amount: number
          tax_id: string | null
          tax_name: string | null
          tax_rate: number | null
          total: number
          unit_price: number
          unit_type: string
        }
        Insert: {
          company_id: string
          converted_unit_price?: number | null
          created_at?: string
          description: string
          document_currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          invoice_id: string
          is_optional?: boolean
          item_name?: string | null
          original_currency?: string | null
          original_unit_price?: number | null
          product_id?: string | null
          quantity?: number
          sort_order?: number | null
          tax_amount?: number
          tax_id?: string | null
          tax_name?: string | null
          tax_rate?: number | null
          total?: number
          unit_price?: number
          unit_type?: string
        }
        Update: {
          company_id?: string
          converted_unit_price?: number | null
          created_at?: string
          description?: string
          document_currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          invoice_id?: string
          is_optional?: boolean
          item_name?: string | null
          original_currency?: string | null
          original_unit_price?: number | null
          product_id?: string | null
          quantity?: number
          sort_order?: number | null
          tax_amount?: number
          tax_id?: string | null
          tax_name?: string | null
          tax_rate?: number | null
          total?: number
          unit_price?: number
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_company_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id", "company_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_company_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "company_taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          base_currency: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          date_issued: string
          discount: number | null
          discount_base: number | null
          due_date: string
          estimate_id: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          id: string
          invoice_data: Json
          notes: string | null
          number: string
          paid_at: string | null
          payment_link: string | null
          payment_provider: string | null
          paypal_capture_id: string | null
          paypal_order_id: string | null
          paypal_payer_email: string | null
          product_id: string | null
          proposal_id: string | null
          public_token: string | null
          sent_at: string | null
          status: string
          subtotal: number
          subtotal_base: number | null
          tax: number | null
          tax_base: number | null
          total: number
          total_base: number | null
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          base_currency?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          date_issued?: string
          discount?: number | null
          discount_base?: number | null
          due_date?: string
          estimate_id?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          invoice_data?: Json
          notes?: string | null
          number: string
          paid_at?: string | null
          payment_link?: string | null
          payment_provider?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payer_email?: string | null
          product_id?: string | null
          proposal_id?: string | null
          public_token?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          subtotal_base?: number | null
          tax?: number | null
          tax_base?: number | null
          total?: number
          total_base?: number | null
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          base_currency?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          date_issued?: string
          discount?: number | null
          discount_base?: number | null
          due_date?: string
          estimate_id?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          invoice_data?: Json
          notes?: string | null
          number?: string
          paid_at?: string | null
          payment_link?: string | null
          payment_provider?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payer_email?: string | null
          product_id?: string | null
          proposal_id?: string | null
          public_token?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          subtotal_base?: number | null
          tax?: number | null
          tax_base?: number | null
          total?: number
          total_base?: number | null
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_company_fkey"
            columns: ["client_id", "company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          archived_at: string | null
          author_profile_id: string | null
          company_id: string
          content: string
          created_at: string
          id: string
          kind: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          author_profile_id?: string | null
          company_id: string
          content: string
          created_at?: string
          id?: string
          kind?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          author_profile_id?: string | null
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_products: {
        Row: {
          company_id: string
          created_at: string
          id: string
          interest_level: string | null
          lead_id: string
          notes: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          interest_level?: string | null
          lead_id: string
          notes?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          interest_level?: string | null
          lead_id?: string
          notes?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_products_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          base_currency: string | null
          company_id: string
          company_name: string | null
          created_at: string
          currency: string | null
          email: string | null
          estimated_value: number | null
          estimated_value_base: number | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          external_id: string | null
          first_name: string
          first_touch_channel: string | null
          id: string
          last_interaction_at: string | null
          last_name: string
          last_touch_channel: string | null
          metadata: Json
          notes: string | null
          phone: string | null
          source: string
          source_channel: string | null
          source_detail: string | null
          source_platform: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp: string | null
        }
        Insert: {
          assigned_to?: string | null
          base_currency?: string | null
          company_id: string
          company_name?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          estimated_value?: number | null
          estimated_value_base?: number | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          external_id?: string | null
          first_name: string
          first_touch_channel?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name: string
          last_touch_channel?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          source?: string
          source_channel?: string | null
          source_detail?: string | null
          source_platform?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string | null
        }
        Update: {
          assigned_to?: string | null
          base_currency?: string | null
          company_id?: string
          company_name?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          estimated_value?: number | null
          estimated_value_base?: number | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          external_id?: string | null
          first_name?: string
          first_touch_channel?: string | null
          id?: string
          last_interaction_at?: string | null
          last_name?: string
          last_touch_channel?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          source?: string
          source_channel?: string | null
          source_detail?: string | null
          source_platform?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_account_secrets: {
        Row: {
          access_token: string
          access_token_configured_at: string | null
          access_token_last4: string | null
          company_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          access_token_configured_at?: string | null
          access_token_last4?: string | null
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          access_token_configured_at?: string | null
          access_token_last4?: string | null
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_account_secrets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_accounts: {
        Row: {
          access_token_secret_id: string | null
          company_id: string
          connected_at: string | null
          created_at: string
          id: string
          instagram_business_account_id: string | null
          page_id: string | null
          page_name: string | null
          platform: string
          status: string
          updated_at: string
          verify_token: string | null
        }
        Insert: {
          access_token_secret_id?: string | null
          company_id: string
          connected_at?: string | null
          created_at?: string
          id?: string
          instagram_business_account_id?: string | null
          page_id?: string | null
          page_name?: string | null
          platform: string
          status?: string
          updated_at?: string
          verify_token?: string | null
        }
        Update: {
          access_token_secret_id?: string | null
          company_id?: string
          connected_at?: string | null
          created_at?: string
          id?: string
          instagram_business_account_id?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          status?: string
          updated_at?: string
          verify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_conversation_lead_profiles: {
        Row: {
          account_id: string
          business_type: string | null
          captured_fields: Json
          company_id: string
          conversation_id: string
          created_at: string
          current_status: string | null
          external_user_id: string | null
          goal: string | null
          id: string
          lead_status: string
          name: string | null
          notes: string | null
          phone: string | null
          platform: string
          reference: string | null
          service_interest: string | null
          summary: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          account_id: string
          business_type?: string | null
          captured_fields?: Json
          company_id: string
          conversation_id: string
          created_at?: string
          current_status?: string | null
          external_user_id?: string | null
          goal?: string | null
          id?: string
          lead_status?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          platform?: string
          reference?: string | null
          service_interest?: string | null
          summary?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          account_id?: string
          business_type?: string | null
          captured_fields?: Json
          company_id?: string
          conversation_id?: string
          created_at?: string
          current_status?: string | null
          external_user_id?: string | null
          goal?: string | null
          id?: string
          lead_status?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          platform?: string
          reference?: string | null
          service_interest?: string | null
          summary?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_conversation_lead_profiles_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "meta_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_conversations: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          bot_status: string
          company_id: string
          created_at: string
          external_user_id: string
          id: string
          last_message_at: string | null
          last_message_text: string | null
          linked_client_id: string | null
          linked_deal_id: string | null
          linked_lead_id: string | null
          page_id: string | null
          platform: string
          sender_name: string | null
          sender_profile_pic: string | null
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          bot_status?: string
          company_id: string
          created_at?: string
          external_user_id: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          linked_client_id?: string | null
          linked_deal_id?: string | null
          linked_lead_id?: string | null
          page_id?: string | null
          platform: string
          sender_name?: string | null
          sender_profile_pic?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          bot_status?: string
          company_id?: string
          created_at?: string
          external_user_id?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          linked_client_id?: string | null
          linked_deal_id?: string | null
          linked_lead_id?: string | null
          page_id?: string | null
          platform?: string
          sender_name?: string | null
          sender_profile_pic?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "meta_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversations_linked_client_id_fkey"
            columns: ["linked_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversations_linked_deal_id_fkey"
            columns: ["linked_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversations_linked_lead_id_fkey"
            columns: ["linked_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_messages: {
        Row: {
          account_id: string | null
          attachments: Json
          company_id: string
          conversation_id: string | null
          created_at: string
          direction: string
          external_message_id: string | null
          id: string
          message_type: string
          platform: string
          raw_payload: Json | null
          sent_at: string | null
          text: string | null
        }
        Insert: {
          account_id?: string | null
          attachments?: Json
          company_id: string
          conversation_id?: string | null
          created_at?: string
          direction: string
          external_message_id?: string | null
          id?: string
          message_type?: string
          platform: string
          raw_payload?: Json | null
          sent_at?: string | null
          text?: string | null
        }
        Update: {
          account_id?: string | null
          attachments?: Json
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          message_type?: string
          platform?: string
          raw_payload?: Json | null
          sent_at?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "meta_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "meta_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_webhook_logs: {
        Row: {
          account_id: string | null
          company_id: string | null
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json
          platform: string | null
          processed: boolean
        }
        Insert: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload: Json
          platform?: string | null
          processed?: boolean
        }
        Update: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          platform?: string | null
          processed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "meta_webhook_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "meta_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_webhook_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          company_id: string | null
          created_at: string
          expires_at: string
          id: string
          profile_id: string | null
          provider: string
          redirect_to: string | null
          state_hash: string
          user_auth_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          profile_id?: string | null
          provider: string
          redirect_to?: string | null
          state_hash: string
          user_auth_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          profile_id?: string | null
          provider?: string
          redirect_to?: string | null
          state_hash?: string
          user_auth_id?: string | null
        }
        Relationships: []
      }
      payment_movements: {
        Row: {
          amount: number
          amount_base: number
          base_currency: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          exchange_rate: number
          external_reference: string | null
          id: string
          idempotency_key: string | null
          invoice_id: string | null
          movement_type: string
          original_payment_id: string
          reason: string
        }
        Insert: {
          amount: number
          amount_base: number
          base_currency: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency: string
          exchange_rate?: number
          external_reference?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          movement_type: string
          original_payment_id: string
          reason: string
        }
        Update: {
          amount?: number
          amount_base?: number
          base_currency?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          exchange_rate?: number
          external_reference?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          movement_type?: string
          original_payment_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_movements_invoice_company_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id", "company_id"]
          },
          {
            foreignKeyName: "payment_movements_invoice_company_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "payment_movements_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_movements_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_movements_original_payment_id_fkey"
            columns: ["original_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_movements_payment_company_fkey"
            columns: ["original_payment_id", "company_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          invoice_id: string | null
          mime_type: string
          payment_id: string
          size_bytes: number
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          invoice_id?: string | null
          mime_type: string
          payment_id: string
          size_bytes: number
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          invoice_id?: string | null
          mime_type?: string
          payment_id?: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_base: number | null
          base_currency: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          external_payment_id: string | null
          id: string
          idempotency_key: string | null
          invoice_id: string | null
          method: string
          notes: string | null
          payment_date: string
          payment_number: number
          provider: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_base?: number | null
          base_currency?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          external_payment_id?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          method?: string
          notes?: string | null
          payment_date?: string
          payment_number?: number
          provider?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_base?: number | null
          base_currency?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          external_payment_id?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          method?: string
          notes?: string | null
          payment_date?: string
          payment_number?: number
          provider?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_company_fkey"
            columns: ["client_id", "company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_company_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id", "company_id"]
          },
          {
            foreignKeyName: "payments_invoice_company_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_capabilities: {
        Row: {
          action: string
          capability: string
          created_at: string
          description: string | null
          module: string
        }
        Insert: {
          action: string
          capability: string
          created_at?: string
          description?: string | null
          module: string
        }
        Update: {
          action?: string
          capability?: string
          created_at?: string
          description?: string | null
          module?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          can_assign: boolean
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          company_id: string
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_assign?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          company_id: string
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_assign?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          company_id?: string
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_workflow_steps: {
        Row: {
          assigned_role: string | null
          company_id: string
          created_at: string
          default_duration_days: number
          default_priority: string
          description: string | null
          id: string
          is_active: boolean
          product_id: string
          step_order: number
          title: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          assigned_role?: string | null
          company_id: string
          created_at?: string
          default_duration_days?: number
          default_priority?: string
          description?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          step_order?: number
          title: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          assigned_role?: string | null
          company_id?: string
          created_at?: string
          default_duration_days?: number
          default_priority?: string
          description?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          step_order?: number
          title?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_workflow_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_workflow_steps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "product_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      product_workflows: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          product_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_workflows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number | null
          billing_type: string | null
          category: string | null
          company_id: string
          created_at: string
          currency: string | null
          default_tax_id: string | null
          default_tax_name: string | null
          default_tax_rate: number | null
          deliverables: string | null
          description: string | null
          duration_days: number | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          keywords: string[] | null
          name: string
          proposal_defaults: Json
          slug: string | null
          type: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          billing_type?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          currency?: string | null
          default_tax_id?: string | null
          default_tax_name?: string | null
          default_tax_rate?: number | null
          deliverables?: string | null
          description?: string | null
          duration_days?: number | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          name: string
          proposal_defaults?: Json
          slug?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          billing_type?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          currency?: string | null
          default_tax_id?: string | null
          default_tax_name?: string | null
          default_tax_rate?: number | null
          deliverables?: string | null
          description?: string | null
          duration_days?: number | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          name?: string
          proposal_defaults?: Json
          slug?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_default_tax_id_fkey"
            columns: ["default_tax_id"]
            isOneToOne: false
            referencedRelation: "company_taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_preferences: {
        Row: {
          birth_date: string | null
          created_at: string
          default_dashboard: string
          density: string
          id: string
          language: string
          notification_preferences: Json
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_dismissed: boolean
          preferred_title: string
          profile_id: string
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          default_dashboard?: string
          density?: string
          id?: string
          language?: string
          notification_preferences?: Json
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_dismissed?: boolean
          preferred_title?: string
          profile_id: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          default_dashboard?: string
          density?: string
          id?: string
          language?: string
          notification_preferences?: Json
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_dismissed?: boolean
          preferred_title?: string
          profile_id?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          joined_at: string | null
          last_activity_at: string | null
          location: string | null
          phone: string | null
          reports_to: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          joined_at?: string | null
          last_activity_at?: string | null
          location?: string | null
          phone?: string | null
          reports_to?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          joined_at?: string | null
          last_activity_at?: string | null
          location?: string | null
          phone?: string | null
          reports_to?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_assignees: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          depends_on_milestone_id: string | null
          description: string | null
          id: string
          progress_pct: number
          project_id: string
          sort_order: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          depends_on_milestone_id?: string | null
          description?: string | null
          id?: string
          progress_pct?: number
          project_id: string
          sort_order?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          depends_on_milestone_id?: string | null
          description?: string | null
          id?: string
          progress_pct?: number
          project_id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_depends_on_milestone_id_fkey"
            columns: ["depends_on_milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          archived_at: string | null
          author_profile_id: string | null
          company_id: string
          content: string
          created_at: string
          id: string
          kind: string
          project_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          author_profile_id?: string | null
          company_id: string
          content: string
          created_at?: string
          id?: string
          kind?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          author_profile_id?: string | null
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_time_entries: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          entry_date: string
          id: string
          is_billable: boolean
          profile_id: string | null
          project_id: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          entry_date?: string
          id?: string
          is_billable?: boolean
          profile_id?: string | null
          project_id: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          entry_date?: string
          id?: string
          is_billable?: boolean
          profile_id?: string | null
          project_id?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assigned_to: string | null
          base_currency: string | null
          budget: number | null
          budget_base: number | null
          budget_currency: string | null
          client_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          invoice_id: string | null
          lead_id: string | null
          manager: string | null
          name: string
          priority: string | null
          product_id: string | null
          progress: number | null
          proposal_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          base_currency?: string | null
          budget?: number | null
          budget_base?: number | null
          budget_currency?: string | null
          client_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          manager?: string | null
          name: string
          priority?: string | null
          product_id?: string | null
          progress?: number | null
          proposal_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          base_currency?: string | null
          budget?: number | null
          budget_base?: number | null
          budget_currency?: string | null
          client_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          manager?: string | null
          name?: string
          priority?: string | null
          product_id?: string | null
          progress?: number | null
          proposal_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_manager"
            columns: ["manager"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_finance_summary"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "projects_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_comments: {
        Row: {
          archived_at: string | null
          author_email: string | null
          author_name: string | null
          author_profile_id: string | null
          company_id: string
          content: string
          created_at: string
          id: string
          proposal_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          author_email?: string | null
          author_name?: string | null
          author_profile_id?: string | null
          company_id: string
          content: string
          created_at?: string
          id?: string
          proposal_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          author_email?: string | null
          author_name?: string | null
          author_profile_id?: string | null
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          proposal_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_comments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_comments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          amount: number
          company_id: string
          converted_rate: number | null
          created_at: string
          description: string | null
          document_currency: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          id: string
          is_optional: boolean
          item_name: string
          original_currency: string | null
          original_rate: number | null
          product_id: string | null
          proposal_id: string
          quantity: number
          rate: number
          sort_order: number
          tax_amount: number
          tax_id: string | null
          tax_name: string | null
          tax_rate: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          converted_rate?: number | null
          created_at?: string
          description?: string | null
          document_currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          is_optional?: boolean
          item_name?: string
          original_currency?: string | null
          original_rate?: number | null
          product_id?: string | null
          proposal_id: string
          quantity?: number
          rate?: number
          sort_order?: number
          tax_amount?: number
          tax_id?: string | null
          tax_name?: string | null
          tax_rate?: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          converted_rate?: number | null
          created_at?: string
          description?: string | null
          document_currency?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          is_optional?: boolean
          item_name?: string
          original_currency?: string | null
          original_rate?: number | null
          product_id?: string | null
          proposal_id?: string
          quantity?: number
          rate?: number
          sort_order?: number
          tax_amount?: number
          tax_id?: string | null
          tax_name?: string | null
          tax_rate?: number
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "company_taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_notes: {
        Row: {
          archived_at: string | null
          author_profile_id: string | null
          company_id: string
          content: string
          created_at: string
          id: string
          kind: string
          proposal_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          author_profile_id?: string | null
          company_id: string
          content: string
          created_at?: string
          id?: string
          kind?: string
          proposal_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          author_profile_id?: string | null
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          proposal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_notes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_reminders: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          proposal_id: string
          remind_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          proposal_id: string
          remind_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          proposal_id?: string
          remind_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_reminders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_reminders_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_sends: {
        Row: {
          client_id: string | null
          company_id: string
          created_by: string | null
          deal_id: string | null
          id: string
          lead_id: string | null
          notes: string | null
          product_id: string | null
          proposal_id: string
          sent_at: string
          sent_to_phone: string | null
          status: string | null
          updated_at: string
          whatsapp_conversation_id: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          product_id?: string | null
          proposal_id: string
          sent_at?: string
          sent_to_phone?: string | null
          status?: string | null
          updated_at?: string
          whatsapp_conversation_id?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          product_id?: string | null
          proposal_id?: string
          sent_at?: string
          sent_to_phone?: string | null
          status?: string | null
          updated_at?: string
          whatsapp_conversation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_sends_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_sends_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_sends_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_sends_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_sends_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_sends_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_sends_whatsapp_conversation_id_fkey"
            columns: ["whatsapp_conversation_id"]
            isOneToOne: false
            referencedRelation: "crm_whatsapp_conversation_list"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "proposal_sends_whatsapp_conversation_id_fkey"
            columns: ["whatsapp_conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          archived_at: string | null
          company_id: string
          content_html: string
          content_json: Json
          created_at: string
          created_by: string | null
          default_data: Json
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          product_id: string | null
          product_slug: string | null
          slug: string
          template_key: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          content_html?: string
          content_json?: Json
          created_at?: string
          created_by?: string | null
          default_data?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          product_id?: string | null
          product_slug?: string | null
          slug?: string
          template_key?: string
          title?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          content_html?: string
          content_json?: Json
          created_at?: string
          created_by?: string | null
          default_data?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          product_id?: string | null
          product_slug?: string | null
          slug?: string
          template_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_templates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          adjustment_value: number
          allow_comments: boolean
          amount: number
          amount_base: number | null
          approval_email: string | null
          approval_ip: string | null
          approval_name: string | null
          approved_at: string | null
          assigned_to: string | null
          base_currency: string | null
          client_id: string | null
          company_id: string
          content: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          deal_id: string | null
          description: string | null
          discount_type: string
          discount_value: number
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          expired_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          number: string
          product_id: string | null
          proposal_data: Json
          proposal_date: string | null
          public_token: string | null
          quantity_mode: string
          recipient_address: string | null
          recipient_city: string | null
          recipient_country: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_state: string | null
          recipient_zip_code: string | null
          rejected_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          subtotal_base: number | null
          tags: string[]
          tax_base: number | null
          tax_total: number
          template_id: string | null
          template_key: string | null
          title: string
          total: number
          total_base: number | null
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
          whatsapp_conversation_id: string | null
        }
        Insert: {
          adjustment_value?: number
          allow_comments?: boolean
          amount?: number
          amount_base?: number | null
          approval_email?: string | null
          approval_ip?: string | null
          approval_name?: string | null
          approved_at?: string | null
          assigned_to?: string | null
          base_currency?: string | null
          client_id?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          expired_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          number: string
          product_id?: string | null
          proposal_data?: Json
          proposal_date?: string | null
          public_token?: string | null
          quantity_mode?: string
          recipient_address?: string | null
          recipient_city?: string | null
          recipient_country?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_state?: string | null
          recipient_zip_code?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          subtotal_base?: number | null
          tags?: string[]
          tax_base?: number | null
          tax_total?: number
          template_id?: string | null
          template_key?: string | null
          title: string
          total?: number
          total_base?: number | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
          whatsapp_conversation_id?: string | null
        }
        Update: {
          adjustment_value?: number
          allow_comments?: boolean
          amount?: number
          amount_base?: number | null
          approval_email?: string | null
          approval_ip?: string | null
          approval_name?: string | null
          approved_at?: string | null
          assigned_to?: string | null
          base_currency?: string | null
          client_id?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          expired_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          number?: string
          product_id?: string | null
          proposal_data?: Json
          proposal_date?: string | null
          public_token?: string | null
          quantity_mode?: string
          recipient_address?: string | null
          recipient_city?: string | null
          recipient_country?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_state?: string | null
          recipient_zip_code?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          subtotal_base?: number | null
          tags?: string[]
          tax_base?: number | null
          tax_total?: number
          template_id?: string | null
          template_key?: string | null
          title?: string
          total?: number
          total_base?: number | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
          whatsapp_conversation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_whatsapp_conversation_id_fkey"
            columns: ["whatsapp_conversation_id"]
            isOneToOne: false
            referencedRelation: "crm_whatsapp_conversation_list"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "proposals_whatsapp_conversation_id_fkey"
            columns: ["whatsapp_conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_capabilities: {
        Row: {
          capability: string
          company_id: string
          created_at: string
          id: string
          is_allowed: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          capability: string
          company_id: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          capability?: string
          company_id?: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_capabilities_capability_fkey"
            columns: ["capability"]
            isOneToOne: false
            referencedRelation: "permission_capabilities"
            referencedColumns: ["capability"]
          },
          {
            foreignKeyName: "role_capabilities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          id: string
          lead_id: string | null
          phone: string
          priority: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          phone: string
          priority?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          phone?: string
          priority?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          amount_base: number | null
          base_currency: string | null
          billing_cycle: string
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          end_date: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          id: string
          name: string
          next_billing_date: string | null
          notes: string | null
          product_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_base?: number | null
          base_currency?: string | null
          billing_cycle?: string
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          name: string
          next_billing_date?: string | null
          notes?: string | null
          product_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_base?: number | null
          base_currency?: string | null
          billing_cycle?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          exchange_rate_updated_at?: string | null
          id?: string
          name?: string
          next_billing_date?: string | null
          notes?: string | null
          product_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          entity_type: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          entity_type?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          entity_type?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_completed: boolean
          order_index: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_completed?: boolean
          order_index?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_completed?: boolean
          order_index?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          task_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          task_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          description_html: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          due_date: string | null
          id: string
          order_index: number | null
          priority: string
          related_client_id: string | null
          related_deal_id: string | null
          related_lead_id: string | null
          related_project_id: string | null
          related_proposal_id: string | null
          source_workflow_step_id: string | null
          status: string
          title: string
          updated_at: string
          whatsapp_channel: string | null
          whatsapp_client_id: string | null
          whatsapp_conversation_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_html?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          due_date?: string | null
          id?: string
          order_index?: number | null
          priority?: string
          related_client_id?: string | null
          related_deal_id?: string | null
          related_lead_id?: string | null
          related_project_id?: string | null
          related_proposal_id?: string | null
          source_workflow_step_id?: string | null
          status?: string
          title: string
          updated_at?: string
          whatsapp_channel?: string | null
          whatsapp_client_id?: string | null
          whatsapp_conversation_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_html?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          due_date?: string | null
          id?: string
          order_index?: number | null
          priority?: string
          related_client_id?: string | null
          related_deal_id?: string | null
          related_lead_id?: string | null
          related_project_id?: string | null
          related_proposal_id?: string | null
          source_workflow_step_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          whatsapp_channel?: string | null
          whatsapp_client_id?: string | null
          whatsapp_conversation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_project"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_proposal_id_fkey"
            columns: ["related_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_workflow_step_id_fkey"
            columns: ["source_workflow_step_id"]
            isOneToOne: false
            referencedRelation: "product_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_activity_events: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json
          ticket_id: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
          ticket_id: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          ticket_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activity_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activity_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json
          author_profile_id: string | null
          author_type: string
          body: string
          company_id: string
          contact_id: string | null
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          author_profile_id?: string | null
          author_type?: string
          body: string
          company_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          attachments?: Json
          author_profile_id?: string | null
          author_type?: string
          body?: string
          company_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          closed_at: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          first_response_due_at: string | null
          id: string
          last_reply_at: string | null
          lead_id: string | null
          metadata: Json
          priority: string
          project_id: string | null
          resolution_due_at: string | null
          service: string | null
          source: string
          status: string
          subject: string
          tags: string[]
          ticket_number: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          first_response_due_at?: string | null
          id?: string
          last_reply_at?: string | null
          lead_id?: string | null
          metadata?: Json
          priority?: string
          project_id?: string | null
          resolution_due_at?: string | null
          service?: string | null
          source?: string
          status?: string
          subject: string
          tags?: string[]
          ticket_number?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          first_response_due_at?: string | null
          id?: string
          last_reply_at?: string | null
          lead_id?: string | null
          metadata?: Json
          priority?: string
          project_id?: string | null
          resolution_due_at?: string | null
          service?: string | null
          source?: string
          status?: string
          subject?: string
          tags?: string[]
          ticket_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_items: {
        Row: {
          category: string
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          last_used_at: string | null
          notes: string | null
          owner_id: string | null
          project_id: string | null
          secret_value: string | null
          sensitivity: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
          url: string | null
          username: string | null
        }
        Insert: {
          category?: string
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          notes?: string | null
          owner_id?: string | null
          project_id?: string | null
          secret_value?: string | null
          sensitivity?: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          username?: string | null
        }
        Update: {
          category?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          notes?: string | null
          owner_id?: string | null
          project_id?: string | null
          secret_value?: string | null
          sensitivity?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_client_links: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          whatsapp_channel: string | null
          whatsapp_conversation_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          whatsapp_channel?: string | null
          whatsapp_conversation_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          whatsapp_channel?: string | null
          whatsapp_conversation_id?: string
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_seen_at: string | null
          metadata: Json | null
          name: string | null
          phone: string | null
          profile_name: string | null
          updated_at: string
          whatsapp_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          profile_name?: string | null
          updated_at?: string
          whatsapp_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          profile_name?: string | null
          updated_at?: string
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_messages: {
        Row: {
          button_id: string | null
          button_title: string | null
          company_id: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          direction: string
          id: string
          lead_id: string | null
          message_type: string | null
          phone: string
          whatsapp_message_id: string | null
        }
        Insert: {
          button_id?: string | null
          button_title?: string | null
          company_id?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction: string
          id?: string
          lead_id?: string | null
          message_type?: string | null
          phone: string
          whatsapp_message_id?: string | null
        }
        Update: {
          button_id?: string | null
          button_title?: string | null
          company_id?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          lead_id?: string | null
          message_type?: string | null
          phone?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "crm_whatsapp_conversation_list"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          bot_enabled: boolean | null
          channel: string | null
          closed_at: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          metadata: Json | null
          needs_human: boolean | null
          status: string | null
          unread_count: number | null
          updated_at: string
          whatsapp_lead_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          bot_enabled?: boolean | null
          channel?: string | null
          closed_at?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          needs_human?: boolean | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string
          whatsapp_lead_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          bot_enabled?: boolean | null
          channel?: string | null
          closed_at?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          needs_human?: boolean | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string
          whatsapp_lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_lead_id_fkey"
            columns: ["whatsapp_lead_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_internal_notes: {
        Row: {
          body: string
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          whatsapp_channel: string | null
          whatsapp_conversation_id: string
        }
        Insert: {
          body: string
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          whatsapp_channel?: string | null
          whatsapp_conversation_id: string
        }
        Update: {
          body?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          whatsapp_channel?: string | null
          whatsapp_conversation_id?: string
        }
        Relationships: []
      }
      whatsapp_leads: {
        Row: {
          asked_for_meeting: boolean | null
          asked_for_price: boolean | null
          asked_for_proposal: boolean | null
          business_name: string | null
          call_availability: string | null
          call_date: string | null
          call_preference: string | null
          call_time: string | null
          content_ready_status: string | null
          created_at: string | null
          current_presence: string | null
          domain_hosting_status: string | null
          first_message: string | null
          id: string
          is_hot_lead: boolean | null
          lead_source: string | null
          lead_summary: string | null
          main_goal: string | null
          monthly_leads_estimate: string | null
          name: string | null
          notes: string | null
          pain_point: string | null
          phone: string
          ready_for_sales: boolean | null
          sales_process_status: string | null
          scheduled_advisor: string | null
          selected_service: string | null
          service_detail: string | null
          social_link: string | null
          solution_type_interest: string | null
          stage: string | null
          team_size: string | null
          updated_at: string | null
          urgency: string | null
          wants_human: boolean | null
          wants_to_start_soon: boolean | null
        }
        Insert: {
          asked_for_meeting?: boolean | null
          asked_for_price?: boolean | null
          asked_for_proposal?: boolean | null
          business_name?: string | null
          call_availability?: string | null
          call_date?: string | null
          call_preference?: string | null
          call_time?: string | null
          content_ready_status?: string | null
          created_at?: string | null
          current_presence?: string | null
          domain_hosting_status?: string | null
          first_message?: string | null
          id?: string
          is_hot_lead?: boolean | null
          lead_source?: string | null
          lead_summary?: string | null
          main_goal?: string | null
          monthly_leads_estimate?: string | null
          name?: string | null
          notes?: string | null
          pain_point?: string | null
          phone: string
          ready_for_sales?: boolean | null
          sales_process_status?: string | null
          scheduled_advisor?: string | null
          selected_service?: string | null
          service_detail?: string | null
          social_link?: string | null
          solution_type_interest?: string | null
          stage?: string | null
          team_size?: string | null
          updated_at?: string | null
          urgency?: string | null
          wants_human?: boolean | null
          wants_to_start_soon?: boolean | null
        }
        Update: {
          asked_for_meeting?: boolean | null
          asked_for_price?: boolean | null
          asked_for_proposal?: boolean | null
          business_name?: string | null
          call_availability?: string | null
          call_date?: string | null
          call_preference?: string | null
          call_time?: string | null
          content_ready_status?: string | null
          created_at?: string | null
          current_presence?: string | null
          domain_hosting_status?: string | null
          first_message?: string | null
          id?: string
          is_hot_lead?: boolean | null
          lead_source?: string | null
          lead_summary?: string | null
          main_goal?: string | null
          monthly_leads_estimate?: string | null
          name?: string | null
          notes?: string | null
          pain_point?: string | null
          phone?: string
          ready_for_sales?: boolean | null
          sales_process_status?: string | null
          scheduled_advisor?: string | null
          selected_service?: string | null
          service_detail?: string | null
          social_link?: string | null
          solution_type_interest?: string | null
          stage?: string | null
          team_size?: string | null
          updated_at?: string | null
          urgency?: string | null
          wants_human?: boolean | null
          wants_to_start_soon?: boolean | null
        }
        Relationships: []
      }
      whatsapp_message_statuses: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message_id: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          status: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_statuses_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          company_id: string
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          direction: string | null
          error_message: string | null
          external_message_id: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          sender_type: string | null
          sent_at: string | null
          status: string | null
          type: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          body?: string | null
          company_id: string
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string | null
          error_message?: string | null
          external_message_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_type?: string | null
          sent_at?: string | null
          status?: string | null
          type?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string | null
          error_message?: string | null
          external_message_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_type?: string | null
          sent_at?: string | null
          status?: string | null
          type?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "crm_whatsapp_conversation_list"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body: string
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          body: string
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_logs: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          payload: Json
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      crm_whatsapp_conversation_list: {
        Row: {
          assigned_to: string | null
          bot_enabled: boolean | null
          business_name: string | null
          channel: string | null
          company_id: string | null
          contact_id: string | null
          contact_name: string | null
          conversation_created_at: string | null
          conversation_id: string | null
          conversation_status: string | null
          conversation_updated_at: string | null
          display_name: string | null
          is_hot_lead: boolean | null
          last_message: string | null
          last_message_at: string | null
          last_seen_at: string | null
          lead_id: string | null
          lead_name: string | null
          lead_stage: string | null
          lead_summary: string | null
          lead_wants_human: boolean | null
          needs_human: boolean | null
          phone: string | null
          ready_for_sales: boolean | null
          selected_service: string | null
          unread_count: number | null
          whatsapp_id: string | null
          whatsapp_lead_id: string | null
          whatsapp_profile_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_lead_id_fkey"
            columns: ["whatsapp_lead_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_whatsapp_messages: {
        Row: {
          button_id: string | null
          button_title: string | null
          company_id: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          delivery_status: string | null
          delivery_status_at: string | null
          direction: string | null
          lead_id: string | null
          message_id: string | null
          message_type: string | null
          phone: string | null
          whatsapp_message_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "crm_whatsapp_conversation_list"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_finance_summary: {
        Row: {
          balance_due: number | null
          balance_due_base: number | null
          base_currency: string | null
          client_id: string | null
          company_id: string | null
          credit_amount: number | null
          credit_amount_base: number | null
          currency: string | null
          date_issued: string | null
          due_date: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          exchange_rate_updated_at: string | null
          finance_status: string | null
          invoice_id: string | null
          number: string | null
          paid_amount: number | null
          paid_amount_base: number | null
          status: string | null
          total: number | null
          total_base: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_company_fkey"
            columns: ["client_id", "company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      append_financial_audit_event: {
        Args: {
          p_amount?: number
          p_company_id: string
          p_credit_note_id?: string
          p_currency?: string
          p_entity_id?: string
          p_entity_type: string
          p_event_type: string
          p_invoice_id?: string
          p_metadata?: Json
          p_new_status?: string
          p_payment_id?: string
          p_previous_status?: string
        }
        Returns: string
      }
      apply_credit_note: {
        Args: { p_credit_note_id: string }
        Returns: {
          credit_note_id: string
          status: string
        }[]
      }
      approve_proposal_public: {
        Args: { p_proposal_public_token: string }
        Returns: {
          invoice_id: string
          invoice_number: string
          invoice_public_token: string
          invoice_status: string
          invoice_total: number
          proposal_id: string
        }[]
      }
      can_access_internal_chat_channel: {
        Args: { _channel_id: string }
        Returns: boolean
      }
      can_manage_internal_chat_channel: {
        Args: { _channel_id: string }
        Returns: boolean
      }
      can_manage_users: { Args: never; Returns: boolean }
      cancel_credit_note: {
        Args: { p_credit_note_id: string; p_reason?: string }
        Returns: {
          credit_note_id: string
          status: string
        }[]
      }
      cleanup_expired_internal_chat_attachments: {
        Args: never
        Returns: number
      }
      convert_estimate_to_invoice: {
        Args: { p_estimate_id: string }
        Returns: {
          created: boolean
          invoice_id: string
        }[]
      }
      create_project_from_paid_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          created: boolean
          project_id: string
          tasks_created: number
        }[]
      }
      crm_convert_currency_amount: {
        Args: {
          p_amount: number
          p_from_currency: string
          p_to_currency: string
          p_usd_to_dop_rate: number
        }
        Returns: number
      }
      crm_finance_currency_snapshot: {
        Args: { p_company_id: string }
        Returns: {
          base_currency: string
          rate_source: string
          rate_updated_at: string
          usd_to_dop_rate: number
        }[]
      }
      get_authorization_context: {
        Args: { p_user_id: string }
        Returns: {
          company_exists: boolean
          company_id: string
          profile_active: boolean
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_company_team_members: {
        Args: {
          _department?: string
          _is_active?: boolean
          _role?: Database["public"]["Enums"]["app_role"]
          _search?: string
        }
        Returns: {
          deals_assigned: number
          department: string
          email: string
          full_name: string
          is_active: boolean
          joined_at: string
          last_activity_at: string
          leads_assigned: number
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          tasks_assigned: number
          user_id: string
        }[]
      }
      get_current_account_profile: {
        Args: never
        Returns: {
          avatar_url: string
          company_id: string
          department: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
          user_id: string
        }[]
      }
      get_current_company_id: { Args: never; Returns: string }
      get_current_profile_id: { Args: never; Returns: string }
      get_invitation_acceptance_status: {
        Args: { _email?: string; _token: string }
        Returns: {
          email: string
          expires_at: string
          is_valid: boolean
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }[]
      }
      get_invoice_financial_balance: {
        Args: { p_invoice_id: string }
        Returns: {
          balance_due: number
          balance_due_base: number
          base_currency: string
          company_id: string
          completed_payments: number
          completed_payments_base: number
          currency: string
          exchange_rate: number
          invoice_id: string
          total_amount: number
          total_base: number
          valid_credits: number
          valid_credits_base: number
        }[]
      }
      get_invoice_public: {
        Args: { p_invoice_public_token: string }
        Returns: Json
      }
      get_or_create_internal_direct_chat: {
        Args: { _other_profile_id: string }
        Returns: string
      }
      get_payment_net_balance: {
        Args: { p_payment_id: string }
        Returns: {
          company_id: string
          invoice_id: string
          movement_amount: number
          movement_amount_base: number
          net_amount: number
          net_amount_base: number
          original_amount: number
          original_amount_base: number
          payment_id: string
        }[]
      }
      get_proposal_public: {
        Args: { p_proposal_public_token: string }
        Returns: Json
      }
      get_team_member_activity: {
        Args: { _limit?: number; _profile_id: string }
        Returns: {
          action: string
          created_at: string
          detail: string
          entity_id: string
          entity_type: string
          id: string
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { p_capability: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: { Args: never; Returns: boolean }
      is_internal_chat_member: {
        Args: { _channel_id: string }
        Returns: boolean
      }
      issue_credit_note: {
        Args: { p_credit_note_id: string }
        Returns: {
          credit_note_id: string
          status: string
        }[]
      }
      issue_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          invoice_id: string
          sent_at: string
          status: string
        }[]
      }
      link_internal_chat_attachment_message: {
        Args: { _message_id: string; _storage_path: string }
        Returns: {
          channel_id: string
          company_id: string
          created_at: string
          deleted_at: string | null
          expires_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          mime_type: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "internal_chat_attachments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_internal_chat_users: {
        Args: { _search?: string }
        Returns: {
          avatar_url: string
          department: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_activity_at: string
          phone: string
          user_id: string
        }[]
      }
      log_activity_event: {
        Args: {
          p_action: string
          p_company_id: string
          p_dedupe_window_seconds?: number
          p_detail?: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: {
          activity_log_id: string
          inserted: boolean
        }[]
      }
      mark_internal_chat_messages_delivered: {
        Args: { _channel_id: string; _message_ids?: string[] }
        Returns: {
          channel_id: string
          company_id: string
          created_at: string
          delivered_at: string | null
          id: string
          message_id: string
          profile_id: string
          read_at: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "internal_chat_message_receipts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mark_internal_chat_messages_read: {
        Args: { _channel_id: string; _message_ids?: string[] }
        Returns: {
          channel_id: string
          company_id: string
          created_at: string
          delivered_at: string | null
          id: string
          message_id: string
          profile_id: string
          read_at: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "internal_chat_message_receipts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      refresh_invoice_finance_status: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      refund_invoice_payment: {
        Args: {
          p_amount: number
          p_external_reference?: string
          p_idempotency_key?: string
          p_original_payment_id: string
          p_reason: string
        }
        Returns: {
          invoice_id: string
          movement_id: string
          original_payment_id: string
          refunded_amount: number
          remaining_invoice_balance: number
          remaining_payment_balance: number
        }[]
      }
      register_internal_chat_attachment: {
        Args: {
          _channel_id: string
          _expires_in_days: number
          _file_name: string
          _file_size: number
          _mime_type: string
          _storage_path: string
        }
        Returns: {
          channel_id: string
          company_id: string
          created_at: string
          deleted_at: string | null
          expires_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          mime_type: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "internal_chat_attachments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_invoice_payment: {
        Args: {
          p_amount: number
          p_client_id?: string
          p_external_payment_id?: string
          p_idempotency_key?: string
          p_invoice_id: string
          p_method?: string
          p_notes?: string
          p_payment_date?: string
          p_provider?: string
          p_reference?: string
          p_status?: string
        }
        Returns: {
          became_paid: boolean
          invoice_id: string
          invoice_status: string
          payment_id: string
          project_created: boolean
          project_error: string
          project_id: string
          remaining_balance: number
        }[]
      }
      register_unapplied_payment: {
        Args: {
          p_amount: number
          p_base_currency?: string
          p_client_id?: string
          p_currency?: string
          p_exchange_rate?: number
          p_exchange_rate_source?: string
          p_exchange_rate_updated_at?: string
          p_method?: string
          p_notes?: string
          p_payment_date?: string
          p_reference?: string
          p_status?: string
        }
        Returns: {
          payment_id: string
        }[]
      }
      require_permission: { Args: { p_capability: string }; Returns: undefined }
      reschedule_pending_payment: {
        Args: { p_payment_date: string; p_payment_id: string }
        Returns: {
          payment_date: string
          payment_id: string
        }[]
      }
      reverse_invoice_payment: {
        Args: {
          p_external_reference?: string
          p_idempotency_key?: string
          p_original_payment_id: string
          p_reason: string
        }
        Returns: {
          invoice_id: string
          movement_id: string
          original_payment_id: string
          remaining_invoice_balance: number
          remaining_payment_balance: number
          reversed_amount: number
        }[]
      }
      save_credit_note: {
        Args: {
          p_amount?: number
          p_client_id?: string
          p_credit_note_id?: string
          p_date_issued?: string
          p_invoice_id?: string
          p_notes?: string
          p_reason?: string
        }
        Returns: {
          amount: number
          client_id: string
          credit_note_id: string
          credit_note_number: number
          invoice_id: string
          status: string
        }[]
      }
      save_invoice_with_items: {
        Args: { p_invoice?: Json; p_invoice_id?: string; p_items?: Json }
        Returns: {
          created: boolean
          discount: number
          invoice_id: string
          item_count: number
          number: string
          status: string
          subtotal: number
          tax: number
          total: number
        }[]
      }
      toggle_team_member_status: {
        Args: { _active: boolean; _target_user_id: string }
        Returns: undefined
      }
      touch_internal_chat_presence: {
        Args: { _active_channel_id?: string }
        Returns: {
          active_channel_id: string | null
          company_id: string
          created_at: string
          id: string
          last_seen_at: string
          profile_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "internal_chat_presence"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_team_member_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      void_invoice: {
        Args: { p_invoice_id: string; p_reason?: string }
        Returns: {
          invoice_id: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "sales_agent"
        | "viewer"
        | "collaborator"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      lead_status:
        | "New"
        | "Contacted"
        | "Qualified"
        | "Proposal Needed"
        | "Proposal Sent"
        | "Negotiation"
        | "Won"
        | "Lost"
        | "Not Interested"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "sales_agent",
        "viewer",
        "collaborator",
      ],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      lead_status: [
        "New",
        "Contacted",
        "Qualified",
        "Proposal Needed",
        "Proposal Sent",
        "Negotiation",
        "Won",
        "Lost",
        "Not Interested",
      ],
    },
  },
} as const
