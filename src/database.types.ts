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
      dismissed_candidates: {
        Row: {
          category: string
          dismissed_at: string
          id: string
          name: string
          reason: string | null
          url: string
        }
        Insert: {
          category: string
          dismissed_at?: string
          id: string
          name: string
          reason?: string | null
          url?: string
        }
        Update: {
          category?: string
          dismissed_at?: string
          id?: string
          name?: string
          reason?: string | null
          url?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          collection: string
          created_at: string
          data: Json
          id: string
          name: string
          type: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          collection?: string
          created_at?: string
          data: Json
          id: string
          name: string
          type: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          collection?: string
          created_at?: string
          data?: Json
          id?: string
          name?: string
          type?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          category: string
          context: string | null
          price_limit: number | null
          updated_at: string
        }
        Insert: {
          category: string
          context?: string | null
          price_limit?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          context?: string | null
          price_limit?: number | null
          updated_at?: string
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
