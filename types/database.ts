/**
 * Database type definitions for Supabase
 * Auto-generated types based on the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      topics: {
        Row: {
          id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          topic_id: string
          filename: string
          original_filename: string
          content: string
          format: 'txt' | 'md' | 'html' | 'markdown'
          size_bytes: number
          uploaded_at: string
          processed_at: string | null
          embedding_status: 'pending' | 'processing' | 'completed' | 'failed'
        }
        Insert: {
          id?: string
          topic_id: string
          filename: string
          original_filename: string
          content: string
          format: 'txt' | 'md' | 'html' | 'markdown'
          size_bytes: number
          uploaded_at?: string
          processed_at?: string | null
          embedding_status?: 'pending' | 'processing' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          topic_id?: string
          filename?: string
          original_filename?: string
          content?: string
          format?: 'txt' | 'md' | 'html' | 'markdown'
          size_bytes?: number
          uploaded_at?: string
          processed_at?: string | null
          embedding_status?: 'pending' | 'processing' | 'completed' | 'failed'
        }
        Relationships: [
          {
            foreignKeyName: "documents_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          }
        ]
      }
      embeddings: {
        Row: {
          id: string
          document_id: string
          topic_id: string
          chunk_text: string
          chunk_index: number
          vector: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          topic_id: string
          chunk_text: string
          chunk_index: number
          vector?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          topic_id?: string
          chunk_text?: string
          chunk_index?: number
          vector?: number[] | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embeddings_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          }
        ]
      }
      what_ifs: {
        Row: {
          id: string
          topic_id: string
          prompt: string | null
          title: string
          content: string | null
          word_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          prompt?: string | null
          title: string
          content?: string | null
          word_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          prompt?: string | null
          title?: string
          content?: string | null
          word_count?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "what_ifs_topic_id_fkey"
            columns: ["topic_id"]
            referencedRelation: "topics"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_topic_stats: {
        Args: {
          topic_uuid: string
        }
        Returns: Json
      }
      match_embeddings: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          document_id: string
          chunk_text: string
          chunk_index: number
          similarity: number
        }[]
      }
      match_embeddings_by_topic: {
        Args: {
          query_embedding: string
          topic_uuid: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          document_id: string
          chunk_text: string
          chunk_index: number
          similarity: number
        }[]
      }
      create_match_embeddings_function: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type Topic = Database['public']['Tables']['topics']['Row']
export type TopicInsert = Database['public']['Tables']['topics']['Insert']
export type TopicUpdate = Database['public']['Tables']['topics']['Update']

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type Embedding = Database['public']['Tables']['embeddings']['Row']
export type EmbeddingInsert = Database['public']['Tables']['embeddings']['Insert']
export type EmbeddingUpdate = Database['public']['Tables']['embeddings']['Update']

export type WhatIf = Database['public']['Tables']['what_ifs']['Row']
export type WhatIfInsert = Database['public']['Tables']['what_ifs']['Insert']
export type WhatIfUpdate = Database['public']['Tables']['what_ifs']['Update']

// Topic statistics type
export interface TopicStats {
  document_count: number
  total_size_bytes: number
  embedding_count: number
  what_if_count: number
  last_document_upload: string | null
  last_what_if_creation: string | null
}
