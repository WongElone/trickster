/**
 * TypeScript type definitions for Trickster application
 * Central location for all shared types
 */

import type { Language, Theme, FileFormat } from '../constants/app'

// Database Types (will be extended in Phase 2)
export interface Topic {
  id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
  document_count?: number
}

export interface Document {
  id: string
  topic_id: string
  filename: string
  content: string
  format: FileFormat
  size: number
  uploaded_at: string
  processed_at?: string
}

export interface Embedding {
  id: string
  document_id: string
  chunk_text: string
  vector: number[]
  chunk_index: number
  created_at: string
}

export interface WhatIf {
  id: string
  topic_id: string
  prompt: string
  content: string
  file_path: string
  created_at: string
}

// Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatConversation {
  id: string
  topic_id: string
  messages: ChatMessage[]
  settings: ChatSettings
  created_at: string
  updated_at: string
}

export interface ChatSettings {
  contextWindow: number
  systemPrompt: string
  temperature?: number
  topP?: number
}

// UI Types
export interface UserPreferences {
  language: Language
  theme: Theme
  defaultChatSettings: ChatSettings
}

export interface LoadingState {
  isLoading: boolean
  message?: string
}

export interface ErrorState {
  hasError: boolean
  message?: string
  code?: string
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// File Upload Types
export interface FileUploadProgress {
  filename: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

// Vector Search Types
export interface SearchResult {
  document_id: string
  chunk_text: string
  similarity_score: number
  metadata?: Record<string, any>
}

// Streaming Types
export interface StreamingResponse {
  chunk: string
  isComplete: boolean
  error?: string
}
