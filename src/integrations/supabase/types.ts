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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          file_id: string | null
          file_name: string
          id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          file_id?: string | null
          file_name: string
          id?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          file_id?: string | null
          file_name?: string
          id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_action_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_file_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_file_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_file_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_subscriptions: {
        Row: {
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          ai_metadata: Json | null
          api_key_id: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          error_stack: string | null
          error_type: string | null
          file_metadata: Json | null
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          request_headers: Json | null
          request_size: number | null
          response_body: string | null
          response_size: number | null
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          error_stack?: string | null
          error_type?: string | null
          file_metadata?: Json | null
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          request_headers?: Json | null
          request_size?: number | null
          response_body?: string | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          error_stack?: string | null
          error_type?: string | null
          file_metadata?: Json | null
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          request_headers?: Json | null
          request_size?: number | null
          response_body?: string | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_webhooks: {
        Row: {
          created_at: string
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          secret: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_seen: boolean
          product_id: string | null
          sender_id: string
          text: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_seen?: boolean
          product_id?: string | null
          sender_id: string
          text: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_seen?: boolean
          product_id?: string | null
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          product_id: string | null
          updated_at: string
          user_1: string
          user_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          product_id?: string | null
          updated_at?: string
          user_1: string
          user_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          product_id?: string | null
          updated_at?: string
          user_1?: string
          user_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      file_comments: {
        Row: {
          content: string
          created_at: string
          file_id: string
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_id: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_id?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_comments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "file_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      file_shares: {
        Row: {
          access_type: string
          created_at: string
          custom_slug: string | null
          download_count: number | null
          download_limit: number | null
          expires_at: string | null
          file_id: string
          id: string
          last_accessed_at: string | null
          password_hash: string | null
          permission: string
          share_code: string | null
          token: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          access_type?: string
          created_at?: string
          custom_slug?: string | null
          download_count?: number | null
          download_limit?: number | null
          expires_at?: string | null
          file_id: string
          id?: string
          last_accessed_at?: string | null
          password_hash?: string | null
          permission?: string
          share_code?: string | null
          token?: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          access_type?: string
          created_at?: string
          custom_slug?: string | null
          download_count?: number | null
          download_limit?: number | null
          expires_at?: string | null
          file_id?: string
          id?: string
          last_accessed_at?: string | null
          password_hash?: string | null
          permission?: string
          share_code?: string | null
          token?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tags: {
        Row: {
          created_at: string
          file_id: string
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_tags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          cloudinary_public_id: string | null
          cloudinary_url: string | null
          file_id: string
          id: string
          size: number | null
          uploaded_at: string
          user_id: string
          version_number: number
        }
        Insert: {
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          file_id: string
          id?: string
          size?: number | null
          uploaded_at?: string
          user_id: string
          version_number?: number
        }
        Update: {
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          file_id?: string
          id?: string
          size?: number | null
          uploaded_at?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          cloudinary_public_id: string | null
          cloudinary_url: string | null
          created_at: string
          id: string
          is_folder: boolean
          is_starred: boolean | null
          is_trashed: boolean | null
          mime_type: string | null
          name: string
          parent_id: string | null
          size: number | null
          storage_path: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          created_at?: string
          id?: string
          is_folder?: boolean
          is_starred?: boolean | null
          is_trashed?: boolean | null
          mime_type?: string | null
          name: string
          parent_id?: string | null
          size?: number | null
          storage_path: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          created_at?: string
          id?: string
          is_folder?: boolean
          is_starred?: boolean | null
          is_trashed?: boolean | null
          mime_type?: string | null
          name?: string
          parent_id?: string | null
          size?: number | null
          storage_path?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      marketplace_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string
          parent_comment_id: string | null
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id: string
          parent_comment_id?: string | null
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "marketplace_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_daily_analytics: {
        Row: {
          created_at: string
          date: string
          downloads: number
          id: string
          likes: number
          listing_id: string
          saves: number
        }
        Insert: {
          created_at?: string
          date?: string
          downloads?: number
          id?: string
          likes?: number
          listing_id: string
          saves?: number
        }
        Update: {
          created_at?: string
          date?: string
          downloads?: number
          id?: string
          likes?: number
          listing_id?: string
          saves?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_daily_analytics_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_likes: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_likes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listing_tags: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          tag_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          tag_name: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_tags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          download_count: number
          file_id: string
          id: string
          is_featured: boolean
          like_count: number
          save_count: number
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_id: string
          id?: string
          is_featured?: boolean
          like_count?: number
          save_count?: number
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_id?: string
          id?: string
          is_featured?: boolean
          like_count?: number
          save_count?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: true
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason?: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_saves: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          is_read: boolean
          message: string
          read_at: string | null
          related_file_id: string | null
          related_user_email: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_read?: boolean
          message?: string
          read_at?: string | null
          related_file_id?: string | null
          related_user_email?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_read?: boolean
          message?: string
          read_at?: string | null
          related_file_id?: string | null
          related_user_email?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_file_id_fkey"
            columns: ["related_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_trash_days: number
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_banned: boolean
          last_active_at: string | null
          marketplace_banned: boolean
          marketplace_banned_at: string | null
          marketplace_banned_reason: string | null
          storage_limit: number
          storage_plan: string
          updated_at: string
        }
        Insert: {
          auto_trash_days?: number
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_banned?: boolean
          last_active_at?: string | null
          marketplace_banned?: boolean
          marketplace_banned_at?: string | null
          marketplace_banned_reason?: string | null
          storage_limit?: number
          storage_plan?: string
          updated_at?: string
        }
        Update: {
          auto_trash_days?: number
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean
          last_active_at?: string | null
          marketplace_banned?: boolean
          marketplace_banned_at?: string | null
          marketplace_banned_reason?: string | null
          storage_limit?: number
          storage_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_access_log: {
        Row: {
          accessed_at: string
          country: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          referrer: string | null
          share_id: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          referrer?: string | null
          share_id: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          referrer?: string | null
          share_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_access_log_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "file_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_invites: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          email: string
          id: string
          invited_by: string
          share_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          invited_by: string
          share_id: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_invites_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "file_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          is_api_plan: boolean
          metadata: Json | null
          payment_url: string | null
          plan: string
          status: string
          storage_added: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          is_api_plan?: boolean
          metadata?: Json | null
          payment_url?: string | null
          plan: string
          status?: string
          storage_added?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          is_api_plan?: boolean
          metadata?: Json | null
          payment_url?: string | null
          plan?: string
          status?: string
          storage_added?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_enabled: boolean
          country: string | null
          created_at: string
          email_updates_enabled: boolean
          experience_level: string
          id: string
          notifications_enabled: boolean
          onboarding_completed: boolean
          profession: string[]
          theme: string
          updated_at: string
          usage_intent: string[]
          user_id: string
        }
        Insert: {
          ai_enabled?: boolean
          country?: string | null
          created_at?: string
          email_updates_enabled?: boolean
          experience_level?: string
          id?: string
          notifications_enabled?: boolean
          onboarding_completed?: boolean
          profession?: string[]
          theme?: string
          updated_at?: string
          usage_intent?: string[]
          user_id: string
        }
        Update: {
          ai_enabled?: boolean
          country?: string | null
          created_at?: string
          email_updates_enabled?: boolean
          experience_level?: string
          id?: string
          notifications_enabled?: boolean
          onboarding_completed?: boolean
          profession?: string[]
          theme?: string
          updated_at?: string
          usage_intent?: string[]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          activity_visible: boolean
          allow_download: boolean
          analytics_enabled: boolean
          auto_rename_duplicates: boolean
          auto_trash_days: number
          created_at: string
          default_access_type: string
          default_expiry: string
          file_preview_enabled: boolean
          id: string
          notification_dnd: boolean
          notification_muted_types: string[]
          notification_sound: boolean
          notification_vibrate: boolean
          require_password: boolean
          show_view_count: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_visible?: boolean
          allow_download?: boolean
          analytics_enabled?: boolean
          auto_rename_duplicates?: boolean
          auto_trash_days?: number
          created_at?: string
          default_access_type?: string
          default_expiry?: string
          file_preview_enabled?: boolean
          id?: string
          notification_dnd?: boolean
          notification_muted_types?: string[]
          notification_sound?: boolean
          notification_vibrate?: boolean
          require_password?: boolean
          show_view_count?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_visible?: boolean
          allow_download?: boolean
          analytics_enabled?: boolean
          auto_rename_duplicates?: boolean
          auto_trash_days?: number
          created_at?: string
          default_access_type?: string
          default_expiry?: string
          file_preview_enabled?: boolean
          id?: string
          notification_dnd?: boolean
          notification_muted_types?: string[]
          notification_sound?: boolean
          notification_vibrate?: boolean
          require_password?: boolean
          show_view_count?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_terms_acceptance: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          created_at: string
          id: string
          scroll_completed: boolean
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          created_at?: string
          id?: string
          scroll_completed?: boolean
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          created_at?: string
          id?: string
          scroll_completed?: boolean
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      workspace_folder_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_upload: boolean
          can_view: boolean
          created_at: string
          folder_id: string
          id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_upload?: boolean
          can_view?: boolean
          created_at?: string
          folder_id: string
          id?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_upload?: boolean
          can_view?: boolean
          created_at?: string
          folder_id?: string
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_folder_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folder_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invite_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          role: string
          token: string
          use_count: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          role?: string
          token?: string
          use_count?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          role?: string
          token?: string
          use_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invite_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_member_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_invite: boolean
          can_manage_folders: boolean
          can_share: boolean
          can_upload: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_invite?: boolean
          can_manage_folders?: boolean
          can_share?: boolean
          can_upload?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_invite?: boolean
          can_manage_folders?: boolean
          can_share?: boolean
          can_upload?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_member_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_templates: {
        Row: {
          created_at: string
          description: string | null
          folder_structure: Json
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          folder_structure?: Json
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          folder_structure?: Json
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          avatar_url: string | null
          color_theme: string | null
          created_at: string
          description: string | null
          frozen_at: string | null
          frozen_by: string | null
          id: string
          is_frozen: boolean
          name: string
          owner_id: string
          storage_limit: number
          storage_plan: string
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          color_theme?: string | null
          created_at?: string
          description?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          id?: string
          is_frozen?: boolean
          name: string
          owner_id: string
          storage_limit?: number
          storage_plan?: string
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          color_theme?: string | null
          created_at?: string
          description?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          id?: string
          is_frozen?: boolean
          name?: string
          owner_id?: string
          storage_limit?: number
          storage_plan?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_email: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_shared_child: { Args: { file_parent_id: string }; Returns: boolean }
      is_shared_editor: { Args: { file_id_param: string }; Returns: boolean }
      is_workspace_admin_or_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      record_marketplace_download: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      record_marketplace_like: {
        Args: { p_delta: number; p_listing_id: string }
        Returns: undefined
      }
      record_marketplace_save: {
        Args: { p_delta: number; p_listing_id: string }
        Returns: undefined
      }
      search_files_advanced: {
        Args: {
          _date_from?: string
          _date_to?: string
          _file_type?: string
          _limit_count?: number
          _offset_count?: number
          _query: string
          _size_max?: number
          _size_min?: number
          _sort_by?: string
          _user_id: string
          _workspace_scope?: string
        }
        Returns: {
          cloudinary_url: string
          created_at: string
          id: string
          is_folder: boolean
          is_starred: boolean
          mime_type: string
          name: string
          parent_id: string
          relevance_score: number
          size: number
          updated_at: string
          user_id: string
          workspace_id: string
          workspace_name: string
          workspace_type: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      workspace_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "moderator", "user"],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const
