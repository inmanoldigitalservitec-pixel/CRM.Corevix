export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          company_id: string;
          created_at: string;
          detail: string | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          company_id: string;
          created_at?: string;
          detail?: string | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          company_id?: string;
          created_at?: string;
          detail?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      automation_rules: {
        Row: {
          actions: Json;
          company_id: string;
          conditions: Json | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          last_triggered_at: string | null;
          name: string;
          trigger_config: Json;
          trigger_count: number;
          trigger_type: string;
          updated_at: string;
        };
        Insert: {
          actions?: Json;
          company_id: string;
          conditions?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          last_triggered_at?: string | null;
          name: string;
          trigger_config?: Json;
          trigger_count?: number;
          trigger_type: string;
          updated_at?: string;
        };
        Update: {
          actions?: Json;
          company_id?: string;
          conditions?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          last_triggered_at?: string | null;
          name?: string;
          trigger_config?: Json;
          trigger_count?: number;
          trigger_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_rules_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      client_products: {
        Row: {
          billing_type: string | null;
          client_id: string;
          company_id: string;
          created_at: string;
          deal_id: string | null;
          end_date: string | null;
          id: string;
          notes: string | null;
          price: number | null;
          product_id: string;
          start_date: string | null;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          billing_type?: string | null;
          client_id: string;
          company_id: string;
          created_at?: string;
          deal_id?: string | null;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          price?: number | null;
          product_id: string;
          start_date?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          billing_type?: string | null;
          client_id?: string;
          company_id?: string;
          created_at?: string;
          deal_id?: string | null;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          price?: number | null;
          product_id?: string;
          start_date?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_products_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_products_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          account_manager: string | null;
          address: string | null;
          city: string | null;
          company_id: string;
          company_name: string;
          contact_person: string | null;
          country: string | null;
          created_at: string;
          email: string | null;
          id: string;
          industry: string | null;
          notes: string | null;
          phone: string | null;
          status: string;
          tags: string[] | null;
          tax_id: string | null;
          updated_at: string;
          website: string | null;
          whatsapp: string | null;
        };
        Insert: {
          account_manager?: string | null;
          address?: string | null;
          city?: string | null;
          company_id: string;
          company_name: string;
          contact_person?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          industry?: string | null;
          notes?: string | null;
          phone?: string | null;
          status?: string;
          tags?: string[] | null;
          tax_id?: string | null;
          updated_at?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          account_manager?: string | null;
          address?: string | null;
          city?: string | null;
          company_id?: string;
          company_name?: string;
          contact_person?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          industry?: string | null;
          notes?: string | null;
          phone?: string | null;
          status?: string;
          tags?: string[] | null;
          tax_id?: string | null;
          updated_at?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_clients_account_manager";
            columns: ["account_manager"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          company_name: string;
          created_at: string;
          id: string;
          tax_id: string | null;
          updated_at: string;
        };
        Insert: {
          company_name: string;
          created_at?: string;
          id?: string;
          tax_id?: string | null;
          updated_at?: string;
        };
        Update: {
          company_name?: string;
          created_at?: string;
          id?: string;
          tax_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_whatsapp_secrets: {
        Row: {
          access_token: string | null;
          access_token_configured_at: string | null;
          access_token_last4: string | null;
          app_secret: string | null;
          app_secret_configured_at: string | null;
          app_secret_last4: string | null;
          company_id: string;
          created_at: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          access_token?: string | null;
          access_token_configured_at?: string | null;
          access_token_last4?: string | null;
          app_secret?: string | null;
          app_secret_configured_at?: string | null;
          app_secret_last4?: string | null;
          company_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          access_token?: string | null;
          access_token_configured_at?: string | null;
          access_token_last4?: string | null;
          app_secret?: string | null;
          app_secret_configured_at?: string | null;
          app_secret_last4?: string | null;
          company_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_whatsapp_secrets_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_whatsapp_settings: {
        Row: {
          bot_api_url: string | null;
          business_phone: string | null;
          company_id: string;
          connection_status: string;
          created_at: string;
          id: string;
          is_connected: boolean;
          last_error: string | null;
          last_event_at: string | null;
          last_verified_at: string | null;
          meta_app_id: string | null;
          meta_graph_version: string | null;
          phone_number_id: string | null;
          provider: string;
          subscribed_fields: Json | null;
          updated_at: string;
          verify_token: string | null;
          webhook_url: string | null;
          whatsapp_business_account_id: string | null;
        };
        Insert: {
          bot_api_url?: string | null;
          business_phone?: string | null;
          company_id: string;
          connection_status?: string;
          created_at?: string;
          id?: string;
          is_connected?: boolean;
          last_error?: string | null;
          last_event_at?: string | null;
          last_verified_at?: string | null;
          meta_app_id?: string | null;
          meta_graph_version?: string | null;
          phone_number_id?: string | null;
          provider?: string;
          subscribed_fields?: Json | null;
          updated_at?: string;
          verify_token?: string | null;
          webhook_url?: string | null;
          whatsapp_business_account_id?: string | null;
        };
        Update: {
          bot_api_url?: string | null;
          business_phone?: string | null;
          company_id?: string;
          connection_status?: string;
          created_at?: string;
          id?: string;
          is_connected?: boolean;
          last_error?: string | null;
          last_event_at?: string | null;
          last_verified_at?: string | null;
          meta_app_id?: string | null;
          meta_graph_version?: string | null;
          phone_number_id?: string | null;
          provider?: string;
          subscribed_fields?: Json | null;
          updated_at?: string;
          verify_token?: string | null;
          webhook_url?: string | null;
          whatsapp_business_account_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_whatsapp_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          client_id: string | null;
          company_id: string;
          created_at: string;
          department: string | null;
          email: string | null;
          first_name: string;
          id: string;
          is_primary: boolean;
          last_name: string;
          notes: string | null;
          phone: string | null;
          position: string | null;
          tags: string[] | null;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          client_id?: string | null;
          company_id: string;
          created_at?: string;
          department?: string | null;
          email?: string | null;
          first_name: string;
          id?: string;
          is_primary?: boolean;
          last_name: string;
          notes?: string | null;
          phone?: string | null;
          position?: string | null;
          tags?: string[] | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          client_id?: string | null;
          company_id?: string;
          created_at?: string;
          department?: string | null;
          email?: string | null;
          first_name?: string;
          id?: string;
          is_primary?: boolean;
          last_name?: string;
          notes?: string | null;
          phone?: string | null;
          position?: string | null;
          tags?: string[] | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_products: {
        Row: {
          company_id: string;
          created_at: string;
          deal_id: string;
          id: string;
          notes: string | null;
          product_id: string;
          quantity: number | null;
          total_price: number | null;
          unit_price: number | null;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          deal_id: string;
          id?: string;
          notes?: string | null;
          product_id: string;
          quantity?: number | null;
          total_price?: number | null;
          unit_price?: number | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          deal_id?: string;
          id?: string;
          notes?: string | null;
          product_id?: string;
          quantity?: number | null;
          total_price?: number | null;
          unit_price?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_products_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_stages: {
        Row: {
          color: string | null;
          company_id: string;
          created_at: string;
          display_order: number;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          company_id: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          company_id?: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_stages_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          assigned_to: string | null;
          company_id: string;
          created_at: string;
          expected_close: string | null;
          id: string;
          lead_id: string | null;
          name: string;
          notes: string | null;
          probability: number | null;
          stage: string;
          updated_at: string;
          value: number;
        };
        Insert: {
          assigned_to?: string | null;
          company_id: string;
          created_at?: string;
          expected_close?: string | null;
          id?: string;
          lead_id?: string | null;
          name: string;
          notes?: string | null;
          probability?: number | null;
          stage?: string;
          updated_at?: string;
          value?: number;
        };
        Update: {
          assigned_to?: string | null;
          company_id?: string;
          created_at?: string;
          expected_close?: string | null;
          id?: string;
          lead_id?: string | null;
          name?: string;
          notes?: string | null;
          probability?: number | null;
          stage?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      email_accounts: {
        Row: {
          access_token: string | null;
          company_id: string;
          created_at: string;
          display_name: string | null;
          email: string | null;
          email_address: string | null;
          id: string;
          is_active: boolean;
          last_synced_at: string | null;
          provider: string | null;
          refresh_token: string | null;
          scopes: string[];
          settings: Json;
          status: string | null;
          token_expires_at: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          access_token?: string | null;
          company_id: string;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          email_address?: string | null;
          id?: string;
          is_active?: boolean;
          last_synced_at?: string | null;
          provider?: string | null;
          refresh_token?: string | null;
          scopes?: string[];
          settings?: Json;
          status?: string | null;
          token_expires_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          access_token?: string | null;
          company_id?: string;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          email_address?: string | null;
          id?: string;
          is_active?: boolean;
          last_synced_at?: string | null;
          provider?: string | null;
          refresh_token?: string | null;
          scopes?: string[];
          settings?: Json;
          status?: string | null;
          token_expires_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_accounts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      email_attachments: {
        Row: {
          company_id: string;
          content_type: string | null;
          created_at: string;
          filename: string;
          id: string;
          message_id: string | null;
          size_bytes: number | null;
          storage_path: string | null;
        };
        Insert: {
          company_id: string;
          content_type?: string | null;
          created_at?: string;
          filename: string;
          id?: string;
          message_id?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
        };
        Update: {
          company_id?: string;
          content_type?: string | null;
          created_at?: string;
          filename?: string;
          id?: string;
          message_id?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_attachments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "email_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      email_conversations: {
        Row: {
          company_id: string;
          created_at: string;
          email_account_id: string | null;
          from_email: string | null;
          id: string;
          is_read: boolean | null;
          is_starred: boolean | null;
          labels: string[] | null;
          last_message_at: string | null;
          provider: string;
          provider_thread_id: string | null;
          raw: Json | null;
          snippet: string | null;
          status: string | null;
          subject: string | null;
          to_email: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          email_account_id?: string | null;
          from_email?: string | null;
          id?: string;
          is_read?: boolean | null;
          is_starred?: boolean | null;
          labels?: string[] | null;
          last_message_at?: string | null;
          provider?: string;
          provider_thread_id?: string | null;
          raw?: Json | null;
          snippet?: string | null;
          status?: string | null;
          subject?: string | null;
          to_email?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          email_account_id?: string | null;
          from_email?: string | null;
          id?: string;
          is_read?: boolean | null;
          is_starred?: boolean | null;
          labels?: string[] | null;
          last_message_at?: string | null;
          provider?: string;
          provider_thread_id?: string | null;
          raw?: Json | null;
          snippet?: string | null;
          status?: string | null;
          subject?: string | null;
          to_email?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_conversations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_conversations_email_account_id_fkey";
            columns: ["email_account_id"];
            isOneToOne: false;
            referencedRelation: "email_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      email_messages: {
        Row: {
          bcc: string[] | null;
          body: string | null;
          body_html: string | null;
          cc: string[] | null;
          company_id: string;
          conversation_id: string | null;
          created_at: string;
          direction: string | null;
          email_account_id: string | null;
          from_email: string | null;
          id: string;
          is_read: boolean | null;
          label_ids: string[];
          provider: string;
          provider_message_id: string | null;
          provider_thread_id: string | null;
          raw: Json | null;
          recipient: string | null;
          sender: string | null;
          sent_at: string | null;
          snippet: string | null;
          subject: string | null;
          to_email: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          bcc?: string[] | null;
          body?: string | null;
          body_html?: string | null;
          cc?: string[] | null;
          company_id: string;
          conversation_id?: string | null;
          created_at?: string;
          direction?: string | null;
          email_account_id?: string | null;
          from_email?: string | null;
          id?: string;
          is_read?: boolean | null;
          label_ids?: string[];
          provider?: string;
          provider_message_id?: string | null;
          provider_thread_id?: string | null;
          raw?: Json | null;
          recipient?: string | null;
          sender?: string | null;
          sent_at?: string | null;
          snippet?: string | null;
          subject?: string | null;
          to_email?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          bcc?: string[] | null;
          body?: string | null;
          body_html?: string | null;
          cc?: string[] | null;
          company_id?: string;
          conversation_id?: string | null;
          created_at?: string;
          direction?: string | null;
          email_account_id?: string | null;
          from_email?: string | null;
          id?: string;
          is_read?: boolean | null;
          label_ids?: string[];
          provider?: string;
          provider_message_id?: string | null;
          provider_thread_id?: string | null;
          raw?: Json | null;
          recipient?: string | null;
          sender?: string | null;
          sent_at?: string | null;
          snippet?: string | null;
          subject?: string | null;
          to_email?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_messages_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "email_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_messages_email_account_id_fkey";
            columns: ["email_account_id"];
            isOneToOne: false;
            referencedRelation: "email_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_user_id: string | null;
          company_id: string;
          created_at: string;
          department: string | null;
          email: string;
          expires_at: string;
          full_name: string | null;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["invitation_status"];
          token: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          company_id: string;
          created_at?: string;
          department?: string | null;
          email: string;
          expires_at?: string;
          full_name?: string | null;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          token: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          company_id?: string;
          created_at?: string;
          department?: string | null;
          email?: string;
          expires_at?: string;
          full_name?: string | null;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          client_id: string | null;
          company_id: string;
          created_at: string;
          date_issued: string;
          discount: number | null;
          due_date: string;
          id: string;
          notes: string | null;
          number: string;
          status: string;
          subtotal: number;
          tax: number | null;
          total: number;
          updated_at: string;
        };
        Insert: {
          client_id?: string | null;
          company_id: string;
          created_at?: string;
          date_issued?: string;
          discount?: number | null;
          due_date?: string;
          id?: string;
          notes?: string | null;
          number: string;
          status?: string;
          subtotal?: number;
          tax?: number | null;
          total?: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string | null;
          company_id?: string;
          created_at?: string;
          date_issued?: string;
          discount?: number | null;
          due_date?: string;
          id?: string;
          notes?: string | null;
          number?: string;
          status?: string;
          subtotal?: number;
          tax?: number | null;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_products: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          interest_level: string | null;
          lead_id: string;
          notes: string | null;
          product_id: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          interest_level?: string | null;
          lead_id: string;
          notes?: string | null;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          interest_level?: string | null;
          lead_id?: string;
          notes?: string | null;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_products_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          assigned_to: string | null;
          company_id: string;
          company_name: string | null;
          created_at: string;
          email: string | null;
          estimated_value: number | null;
          external_id: string | null;
          first_name: string;
          first_touch_channel: string | null;
          id: string;
          last_interaction_at: string | null;
          last_name: string;
          last_touch_channel: string | null;
          metadata: Json;
          notes: string | null;
          phone: string | null;
          source: string;
          source_channel: string | null;
          source_detail: string | null;
          source_platform: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_medium: string | null;
          utm_source: string | null;
          utm_term: string | null;
          whatsapp: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          company_id: string;
          company_name?: string | null;
          created_at?: string;
          email?: string | null;
          estimated_value?: number | null;
          external_id?: string | null;
          first_name: string;
          first_touch_channel?: string | null;
          id?: string;
          last_interaction_at?: string | null;
          last_name: string;
          last_touch_channel?: string | null;
          metadata?: Json;
          notes?: string | null;
          phone?: string | null;
          source?: string;
          source_channel?: string | null;
          source_detail?: string | null;
          source_platform?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          company_id?: string;
          company_name?: string | null;
          created_at?: string;
          email?: string | null;
          estimated_value?: number | null;
          external_id?: string | null;
          first_name?: string;
          first_touch_channel?: string | null;
          id?: string;
          last_interaction_at?: string | null;
          last_name?: string;
          last_touch_channel?: string | null;
          metadata?: Json;
          notes?: string | null;
          phone?: string | null;
          source?: string;
          source_channel?: string | null;
          source_detail?: string | null;
          source_platform?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          link: string | null;
          message: string | null;
          read: boolean;
          title: string;
          type: string | null;
          user_id: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          message?: string | null;
          read?: boolean;
          title: string;
          type?: string | null;
          user_id: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          message?: string | null;
          read?: boolean;
          title?: string;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      oauth_states: {
        Row: {
          company_id: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          profile_id: string | null;
          provider: string;
          redirect_to: string | null;
          state_hash: string;
          user_auth_id: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          profile_id?: string | null;
          provider: string;
          redirect_to?: string | null;
          state_hash: string;
          user_auth_id?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          profile_id?: string | null;
          provider?: string;
          redirect_to?: string | null;
          state_hash?: string;
          user_auth_id?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          can_assign: boolean;
          can_create: boolean;
          can_delete: boolean;
          can_edit: boolean;
          can_view: boolean;
          company_id: string;
          created_at: string;
          id: string;
          module: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          can_assign?: boolean;
          can_create?: boolean;
          can_delete?: boolean;
          can_edit?: boolean;
          can_view?: boolean;
          company_id: string;
          created_at?: string;
          id?: string;
          module: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          can_assign?: boolean;
          can_create?: boolean;
          can_delete?: boolean;
          can_edit?: boolean;
          can_view?: boolean;
          company_id?: string;
          created_at?: string;
          id?: string;
          module?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "permissions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      product_workflow_steps: {
        Row: {
          assigned_role: string | null;
          company_id: string;
          created_at: string;
          default_duration_days: number;
          default_priority: string;
          description: string | null;
          id: string;
          is_active: boolean;
          product_id: string;
          step_order: number;
          title: string;
          updated_at: string;
          workflow_id: string;
        };
        Insert: {
          assigned_role?: string | null;
          company_id: string;
          created_at?: string;
          default_duration_days?: number;
          default_priority?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          product_id: string;
          step_order?: number;
          title: string;
          updated_at?: string;
          workflow_id: string;
        };
        Update: {
          assigned_role?: string | null;
          company_id?: string;
          created_at?: string;
          default_duration_days?: number;
          default_priority?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          product_id?: string;
          step_order?: number;
          title?: string;
          updated_at?: string;
          workflow_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_workflow_steps_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_workflow_steps_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_workflow_steps_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "product_workflows";
            referencedColumns: ["id"];
          },
        ];
      };
      product_workflows: {
        Row: {
          company_id: string;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          product_id: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_workflows_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_workflows_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          base_price: number | null;
          billing_type: string | null;
          category: string | null;
          company_id: string;
          created_at: string;
          currency: string | null;
          deliverables: string | null;
          description: string | null;
          duration_days: number | null;
          id: string;
          is_active: boolean | null;
          keywords: string[] | null;
          name: string;
          slug: string | null;
          type: string;
          updated_at: string;
        };
        Insert: {
          base_price?: number | null;
          billing_type?: string | null;
          category?: string | null;
          company_id: string;
          created_at?: string;
          currency?: string | null;
          deliverables?: string | null;
          description?: string | null;
          duration_days?: number | null;
          id?: string;
          is_active?: boolean | null;
          keywords?: string[] | null;
          name: string;
          slug?: string | null;
          type?: string;
          updated_at?: string;
        };
        Update: {
          base_price?: number | null;
          billing_type?: string | null;
          category?: string | null;
          company_id?: string;
          created_at?: string;
          currency?: string | null;
          deliverables?: string | null;
          description?: string | null;
          duration_days?: number | null;
          id?: string;
          is_active?: boolean | null;
          keywords?: string[] | null;
          name?: string;
          slug?: string | null;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          company_id: string | null;
          created_at: string;
          department: string | null;
          email: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          joined_at: string | null;
          last_activity_at: string | null;
          location: string | null;
          phone: string | null;
          reports_to: string | null;
          timezone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          company_id?: string | null;
          created_at?: string;
          department?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          is_active?: boolean;
          joined_at?: string | null;
          last_activity_at?: string | null;
          location?: string | null;
          phone?: string | null;
          reports_to?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          company_id?: string | null;
          created_at?: string;
          department?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          joined_at?: string | null;
          last_activity_at?: string | null;
          location?: string | null;
          phone?: string | null;
          reports_to?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_reports_to_fkey";
            columns: ["reports_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      projects: {
        Row: {
          assigned_to: string | null;
          budget: number | null;
          client_id: string | null;
          company_id: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          deal_id: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          lead_id: string | null;
          manager: string | null;
          name: string;
          priority: string | null;
          product_id: string | null;
          progress: number | null;
          start_date: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          budget?: number | null;
          client_id?: string | null;
          company_id: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deal_id?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          lead_id?: string | null;
          manager?: string | null;
          name: string;
          priority?: string | null;
          product_id?: string | null;
          progress?: number | null;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          budget?: number | null;
          client_id?: string | null;
          company_id?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deal_id?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          lead_id?: string | null;
          manager?: string | null;
          name?: string;
          priority?: string | null;
          product_id?: string | null;
          progress?: number | null;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      proposal_sends: {
        Row: {
          client_id: string | null;
          company_id: string;
          created_by: string | null;
          deal_id: string | null;
          id: string;
          lead_id: string | null;
          notes: string | null;
          product_id: string | null;
          proposal_id: string;
          sent_at: string;
          sent_to_phone: string | null;
          status: string | null;
          whatsapp_conversation_id: string | null;
        };
        Insert: {
          client_id?: string | null;
          company_id: string;
          created_by?: string | null;
          deal_id?: string | null;
          id?: string;
          lead_id?: string | null;
          notes?: string | null;
          product_id?: string | null;
          proposal_id: string;
          sent_at?: string;
          sent_to_phone?: string | null;
          status?: string | null;
          whatsapp_conversation_id?: string | null;
        };
        Update: {
          client_id?: string | null;
          company_id?: string;
          created_by?: string | null;
          deal_id?: string | null;
          id?: string;
          lead_id?: string | null;
          notes?: string | null;
          product_id?: string | null;
          proposal_id?: string;
          sent_at?: string;
          sent_to_phone?: string | null;
          status?: string | null;
          whatsapp_conversation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "proposal_sends_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_sends_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_sends_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_sends_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_sends_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_sends_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: false;
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_sends_whatsapp_conversation_id_fkey";
            columns: ["whatsapp_conversation_id"];
            isOneToOne: false;
            referencedRelation: "crm_whatsapp_conversation_list";
            referencedColumns: ["conversation_id"];
          },
          {
            foreignKeyName: "proposal_sends_whatsapp_conversation_id_fkey";
            columns: ["whatsapp_conversation_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      proposals: {
        Row: {
          amount: number;
          client_id: string | null;
          company_id: string;
          content: string | null;
          created_at: string;
          created_by: string | null;
          currency: string | null;
          deal_id: string | null;
          description: string | null;
          id: string;
          lead_id: string | null;
          notes: string | null;
          number: string;
          product_id: string | null;
          sent_at: string | null;
          status: string;
          title: string;
          updated_at: string;
          valid_until: string | null;
          whatsapp_conversation_id: string | null;
        };
        Insert: {
          amount?: number;
          client_id?: string | null;
          company_id: string;
          content?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          deal_id?: string | null;
          description?: string | null;
          id?: string;
          lead_id?: string | null;
          notes?: string | null;
          number: string;
          product_id?: string | null;
          sent_at?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          valid_until?: string | null;
          whatsapp_conversation_id?: string | null;
        };
        Update: {
          amount?: number;
          client_id?: string | null;
          company_id?: string;
          content?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          deal_id?: string | null;
          description?: string | null;
          id?: string;
          lead_id?: string | null;
          notes?: string | null;
          number?: string;
          product_id?: string | null;
          sent_at?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          valid_until?: string | null;
          whatsapp_conversation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "proposals_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposals_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposals_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposals_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposals_whatsapp_conversation_id_fkey";
            columns: ["whatsapp_conversation_id"];
            isOneToOne: false;
            referencedRelation: "crm_whatsapp_conversation_list";
            referencedColumns: ["conversation_id"];
          },
          {
            foreignKeyName: "proposals_whatsapp_conversation_id_fkey";
            columns: ["whatsapp_conversation_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_tasks: {
        Row: {
          assigned_to: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          lead_id: string | null;
          phone: string;
          priority: string | null;
          status: string | null;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          lead_id?: string | null;
          phone: string;
          priority?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          lead_id?: string | null;
          phone?: string;
          priority?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_tasks_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_leads";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          key: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          color: string | null;
          company_id: string;
          created_at: string;
          entity_type: string;
          id: string;
          name: string;
        };
        Insert: {
          color?: string | null;
          company_id: string;
          created_at?: string;
          entity_type?: string;
          id?: string;
          name: string;
        };
        Update: {
          color?: string | null;
          company_id?: string;
          created_at?: string;
          entity_type?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          description_html: string | null;
          due_date: string | null;
          id: string;
          priority: string;
          related_client_id: string | null;
          related_deal_id: string | null;
          related_lead_id: string | null;
          related_project_id: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          description_html?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: string;
          related_client_id?: string | null;
          related_deal_id?: string | null;
          related_lead_id?: string | null;
          related_project_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          description_html?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: string;
          related_client_id?: string | null;
          related_deal_id?: string | null;
          related_lead_id?: string | null;
          related_project_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_related_deal_id_fkey";
            columns: ["related_deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      whatsapp_contacts: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          last_seen_at: string | null;
          metadata: Json | null;
          name: string | null;
          phone: string | null;
          profile_name: string | null;
          updated_at: string;
          whatsapp_id: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          last_seen_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          phone?: string | null;
          profile_name?: string | null;
          updated_at?: string;
          whatsapp_id?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          last_seen_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          phone?: string | null;
          profile_name?: string | null;
          updated_at?: string;
          whatsapp_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_conversation_messages: {
        Row: {
          button_id: string | null;
          button_title: string | null;
          company_id: string | null;
          content: string | null;
          conversation_id: string | null;
          created_at: string | null;
          direction: string;
          id: string;
          lead_id: string | null;
          message_type: string | null;
          phone: string;
          whatsapp_message_id: string | null;
        };
        Insert: {
          button_id?: string | null;
          button_title?: string | null;
          company_id?: string | null;
          content?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          direction: string;
          id?: string;
          lead_id?: string | null;
          message_type?: string | null;
          phone: string;
          whatsapp_message_id?: string | null;
        };
        Update: {
          button_id?: string | null;
          button_title?: string | null;
          company_id?: string | null;
          content?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          direction?: string;
          id?: string;
          lead_id?: string | null;
          message_type?: string | null;
          phone?: string;
          whatsapp_message_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_messages_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "crm_whatsapp_conversation_list";
            referencedColumns: ["conversation_id"];
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_leads";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null;
          bot_enabled: boolean | null;
          channel: string | null;
          closed_at: string | null;
          company_id: string;
          contact_id: string | null;
          created_at: string;
          id: string;
          last_message: string | null;
          last_message_at: string | null;
          lead_id: string | null;
          metadata: Json | null;
          needs_human: boolean | null;
          status: string | null;
          unread_count: number | null;
          updated_at: string;
          whatsapp_lead_id: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          bot_enabled?: boolean | null;
          channel?: string | null;
          closed_at?: string | null;
          company_id: string;
          contact_id?: string | null;
          created_at?: string;
          id?: string;
          last_message?: string | null;
          last_message_at?: string | null;
          lead_id?: string | null;
          metadata?: Json | null;
          needs_human?: boolean | null;
          status?: string | null;
          unread_count?: number | null;
          updated_at?: string;
          whatsapp_lead_id?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          bot_enabled?: boolean | null;
          channel?: string | null;
          closed_at?: string | null;
          company_id?: string;
          contact_id?: string | null;
          created_at?: string;
          id?: string;
          last_message?: string | null;
          last_message_at?: string | null;
          lead_id?: string | null;
          metadata?: Json | null;
          needs_human?: boolean | null;
          status?: string | null;
          unread_count?: number | null;
          updated_at?: string;
          whatsapp_lead_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_lead_id_fkey";
            columns: ["whatsapp_lead_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_leads";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_leads: {
        Row: {
          asked_for_meeting: boolean | null;
          asked_for_price: boolean | null;
          asked_for_proposal: boolean | null;
          business_name: string | null;
          call_availability: string | null;
          call_date: string | null;
          call_preference: string | null;
          call_time: string | null;
          content_ready_status: string | null;
          created_at: string | null;
          current_presence: string | null;
          domain_hosting_status: string | null;
          first_message: string | null;
          id: string;
          is_hot_lead: boolean | null;
          lead_source: string | null;
          lead_summary: string | null;
          main_goal: string | null;
          monthly_leads_estimate: string | null;
          name: string | null;
          notes: string | null;
          pain_point: string | null;
          phone: string;
          ready_for_sales: boolean | null;
          sales_process_status: string | null;
          scheduled_advisor: string | null;
          selected_service: string | null;
          service_detail: string | null;
          social_link: string | null;
          solution_type_interest: string | null;
          stage: string | null;
          team_size: string | null;
          updated_at: string | null;
          urgency: string | null;
          wants_human: boolean | null;
          wants_to_start_soon: boolean | null;
        };
        Insert: {
          asked_for_meeting?: boolean | null;
          asked_for_price?: boolean | null;
          asked_for_proposal?: boolean | null;
          business_name?: string | null;
          call_availability?: string | null;
          call_date?: string | null;
          call_preference?: string | null;
          call_time?: string | null;
          content_ready_status?: string | null;
          created_at?: string | null;
          current_presence?: string | null;
          domain_hosting_status?: string | null;
          first_message?: string | null;
          id?: string;
          is_hot_lead?: boolean | null;
          lead_source?: string | null;
          lead_summary?: string | null;
          main_goal?: string | null;
          monthly_leads_estimate?: string | null;
          name?: string | null;
          notes?: string | null;
          pain_point?: string | null;
          phone: string;
          ready_for_sales?: boolean | null;
          sales_process_status?: string | null;
          scheduled_advisor?: string | null;
          selected_service?: string | null;
          service_detail?: string | null;
          social_link?: string | null;
          solution_type_interest?: string | null;
          stage?: string | null;
          team_size?: string | null;
          updated_at?: string | null;
          urgency?: string | null;
          wants_human?: boolean | null;
          wants_to_start_soon?: boolean | null;
        };
        Update: {
          asked_for_meeting?: boolean | null;
          asked_for_price?: boolean | null;
          asked_for_proposal?: boolean | null;
          business_name?: string | null;
          call_availability?: string | null;
          call_date?: string | null;
          call_preference?: string | null;
          call_time?: string | null;
          content_ready_status?: string | null;
          created_at?: string | null;
          current_presence?: string | null;
          domain_hosting_status?: string | null;
          first_message?: string | null;
          id?: string;
          is_hot_lead?: boolean | null;
          lead_source?: string | null;
          lead_summary?: string | null;
          main_goal?: string | null;
          monthly_leads_estimate?: string | null;
          name?: string | null;
          notes?: string | null;
          pain_point?: string | null;
          phone?: string;
          ready_for_sales?: boolean | null;
          sales_process_status?: string | null;
          scheduled_advisor?: string | null;
          selected_service?: string | null;
          service_detail?: string | null;
          social_link?: string | null;
          solution_type_interest?: string | null;
          stage?: string | null;
          team_size?: string | null;
          updated_at?: string | null;
          urgency?: string | null;
          wants_human?: boolean | null;
          wants_to_start_soon?: boolean | null;
        };
        Relationships: [];
      };
      whatsapp_message_statuses: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          message_id: string | null;
          status: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          message_id?: string | null;
          status: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          message_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_statuses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_message_statuses_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_messages: {
        Row: {
          body: string | null;
          company_id: string;
          conversation_id: string | null;
          created_at: string;
          delivered_at: string | null;
          direction: string | null;
          error_message: string | null;
          external_message_id: string | null;
          failed_at: string | null;
          id: string;
          metadata: Json | null;
          read_at: string | null;
          sender_type: string | null;
          sent_at: string | null;
          status: string | null;
          type: string | null;
          whatsapp_message_id: string | null;
        };
        Insert: {
          body?: string | null;
          company_id: string;
          conversation_id?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          direction?: string | null;
          error_message?: string | null;
          external_message_id?: string | null;
          failed_at?: string | null;
          id?: string;
          metadata?: Json | null;
          read_at?: string | null;
          sender_type?: string | null;
          sent_at?: string | null;
          status?: string | null;
          type?: string | null;
          whatsapp_message_id?: string | null;
        };
        Update: {
          body?: string | null;
          company_id?: string;
          conversation_id?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          direction?: string | null;
          error_message?: string | null;
          external_message_id?: string | null;
          failed_at?: string | null;
          id?: string;
          metadata?: Json | null;
          read_at?: string | null;
          sender_type?: string | null;
          sent_at?: string | null;
          status?: string | null;
          type?: string | null;
          whatsapp_message_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "crm_whatsapp_conversation_list";
            referencedColumns: ["conversation_id"];
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_templates: {
        Row: {
          body: string;
          company_id: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          body: string;
          company_id: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          body?: string;
          company_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_webhook_logs: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          payload: Json;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      crm_whatsapp_conversation_list: {
        Row: {
          assigned_to: string | null;
          bot_enabled: boolean | null;
          business_name: string | null;
          channel: string | null;
          company_id: string | null;
          contact_id: string | null;
          contact_name: string | null;
          conversation_created_at: string | null;
          conversation_id: string | null;
          conversation_status: string | null;
          conversation_updated_at: string | null;
          display_name: string | null;
          is_hot_lead: boolean | null;
          last_message: string | null;
          last_message_at: string | null;
          last_seen_at: string | null;
          lead_id: string | null;
          lead_name: string | null;
          lead_stage: string | null;
          lead_summary: string | null;
          lead_wants_human: boolean | null;
          needs_human: boolean | null;
          phone: string | null;
          ready_for_sales: boolean | null;
          selected_service: string | null;
          unread_count: number | null;
          whatsapp_id: string | null;
          whatsapp_lead_id: string | null;
          whatsapp_profile_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_lead_id_fkey";
            columns: ["whatsapp_lead_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_leads";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_whatsapp_messages: {
        Row: {
          button_id: string | null;
          button_title: string | null;
          company_id: string | null;
          content: string | null;
          conversation_id: string | null;
          created_at: string | null;
          delivery_status: string | null;
          delivery_status_at: string | null;
          direction: string | null;
          lead_id: string | null;
          message_id: string | null;
          message_type: string | null;
          phone: string | null;
          whatsapp_message_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_messages_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "crm_whatsapp_conversation_list";
            referencedColumns: ["conversation_id"];
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_conversation_messages_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_leads";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      can_manage_users: { Args: never; Returns: boolean };
      get_company_team_members: {
        Args: {
          _department?: string;
          _is_active?: boolean;
          _role?: Database["public"]["Enums"]["app_role"];
          _search?: string;
        };
        Returns: {
          deals_assigned: number;
          department: string;
          email: string;
          full_name: string;
          is_active: boolean;
          joined_at: string;
          last_activity_at: string;
          leads_assigned: number;
          profile_id: string;
          role: Database["public"]["Enums"]["app_role"];
          tasks_assigned: number;
          user_id: string;
        }[];
      };
      get_current_company_id: { Args: never; Returns: string };
      get_current_profile_id: { Args: never; Returns: string };
      get_team_member_activity: {
        Args: { _limit?: number; _profile_id: string };
        Returns: {
          action: string;
          created_at: string;
          detail: string;
          entity_id: string;
          entity_type: string;
          id: string;
        }[];
      };
      get_user_company_id: { Args: { _user_id: string }; Returns: string };
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_company_member: { Args: never; Returns: boolean };
      toggle_team_member_status: {
        Args: { _active: boolean; _target_user_id: string };
        Returns: undefined;
      };
      update_team_member_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"];
          _target_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "sales_agent" | "collaborator" | "viewer";
      invitation_status: "pending" | "accepted" | "expired" | "revoked";
      lead_status:
        | "New"
        | "Contacted"
        | "Qualified"
        | "Proposal Needed"
        | "Proposal Sent"
        | "Negotiation"
        | "Won"
        | "Lost"
        | "Not Interested";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "manager", "sales_agent", "collaborator", "viewer"],
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
} as const;
