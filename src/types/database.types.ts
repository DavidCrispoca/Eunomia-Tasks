/**
 * Tipos de la base de datos de Supabase (generados con el MCP de Supabase
 * tras la migración `google_calendar_sync`, 2026-09-24).
 * Nota: incluyen restos legacy aún presentes en la BD en vivo
 * (`google_tokens`, `whatsapp_*`, `external_id`, `briefing_time`); la
 * limpieza corresponde a ejecutar `supabase/schema.sql` completo.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      google_calendar_connections: {
        Row: {
          blocks_hash: string | null
          calendar_id: string
          connected_at: string
          google_account_email: string
          last_sync_at: string | null
          paused: boolean
          refresh_token_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocks_hash?: string | null
          calendar_id?: string
          connected_at?: string
          google_account_email: string
          last_sync_at?: string | null
          paused?: boolean
          refresh_token_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocks_hash?: string | null
          calendar_id?: string
          connected_at?: string
          google_account_email?: string
          last_sync_at?: string | null
          paused?: boolean
          refresh_token_encrypted?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_event_links: {
        Row: {
          block_id: string
          calendar_id: string
          created_at: string
          google_event_id: string
          synced_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_id: string
          calendar_id?: string
          created_at?: string
          google_event_id: string
          synced_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_id?: string
          calendar_id?: string
          created_at?: string
          google_event_id?: string
          synced_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_event_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          day: string
          id: string
          kind: string
          sent_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          channel: string
          day: string
          id?: string
          kind: string
          sent_at?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          day?: string
          id?: string
          kind?: string
          sent_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          timezone: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          name?: string | null
          timezone?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          timezone?: string
        }
        Relationships: []
      }
      task_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          group_id: string | null
          id: string
          notes: string
          order: number
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          notes?: string
          order?: number
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          notes?: string
          order?: number
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_group_id_fk"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          color: string
          created_at: string
          date: string
          end: string
          id: string
          start: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          date: string
          end: string
          id?: string
          start: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          date?: string
          end?: string
          id?: string
          start?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prefs: {
        Row: {
          language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          language: string
          updated_at?: string
          user_id: string
        }
        Update: {
          language?: string
          updated_at?: string
          user_id?: string
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
}

export const Constants = {
  public: {
    Enums: {},
  },
} as const
