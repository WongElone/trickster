/**
 * Application constants for Trickster
 * Central location for application-specific constants that don't belong in nuxt.config.ts
 * Note: Most configuration is now in nuxt.config.ts - this file contains app-specific constants only
 */

export const APP_CONFIG = {
  // Application Information
  NAME: 'Trickster',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-Powered Imagination Generator',
  
  // Supported Languages
  LANGUAGES: {
    EN: 'en',
    ZH: 'zh'
  } as const,
  
  // Default Settings (app-specific, not configurable)
  DEFAULTS: {
    LANGUAGE: 'en',
    THEME: 'light'
  },
  
  // Storage Configuration (app-specific keys and paths)
  STORAGE: {
    LOCAL_STORAGE_PREFIX: 'trickster_',
    CHAT_STORAGE_KEY: 'chat_',
    GENERATED_CONTENT_DIR: 'generated-content',
    METADATA_FILE: 'metadata.json'
  },

  // File Upload Configuration (chunking moved to nuxt.config.ts)
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_FORMATS: ['txt', 'md', 'html', 'markdown']
  }
} as const

export type Language = typeof APP_CONFIG.LANGUAGES[keyof typeof APP_CONFIG.LANGUAGES]
export type Theme = 'light' | 'dark'
export type FileFormat = typeof APP_CONFIG.FILE_UPLOAD.SUPPORTED_FORMATS[number]