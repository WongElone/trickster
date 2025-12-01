/**
 * Configuration utility for accessing Nuxt runtime config
 * Provides type-safe access to configuration values
 */

/**
 * Get runtime configuration (server-side only)
 * This function should only be used in server-side code (API routes, server middleware, etc.)
 */
export function useServerConfig() {
  const config = useRuntimeConfig()
  
  return {
    // AI Configuration
    ai: {
      embedding: {
        model: config.ai.embedding.model,
        dimensions: config.ai.embedding.dimensions,
        timeout: config.ai.embedding.timeout
      },
      llm: {
        defaultModel: config.ai.llm.defaultModel,
        defaultTemperature: config.ai.llm.defaultTemperature,
        defaultMaxTokens: config.ai.llm.defaultMaxTokens,
        maxTokensLimit: config.ai.llm.maxTokensLimit,
        topP: config.ai.llm.topP,
        timeout: config.ai.llm.timeout
      },
      vectorSearch: {
        defaultThreshold: config.ai.vectorSearch.defaultThreshold,
        minThreshold: config.ai.vectorSearch.minThreshold,
        maxThreshold: config.ai.vectorSearch.maxThreshold,
        defaultLimit: config.ai.vectorSearch.defaultLimit,
        maxLimit: config.ai.vectorSearch.maxLimit
      }
    },
    
    // Context Assembly Configuration
    contextAssembly: {
      defaultMaxChunks: config.contextAssembly.defaultMaxChunks,
      maxChunksLimit: config.contextAssembly.maxChunksLimit,
      defaultMaxCharacters: config.contextAssembly.defaultMaxCharacters,
      defaultSimilarityThreshold: config.contextAssembly.defaultSimilarityThreshold,
      diversityWeight: config.contextAssembly.diversityWeight,
      coherenceWeight: config.contextAssembly.coherenceWeight,
      searchMultiplier: config.contextAssembly.searchMultiplier,
      defaultStrategy: config.contextAssembly.defaultStrategy,
      defaultIncludeMetadata: config.contextAssembly.defaultIncludeMetadata
    },
    
    // Chat Configuration
    chat: {
      defaultContextWindow: config.chat.defaultContextWindow,
      maxContextWindow: config.chat.maxContextWindow,
      maxHistoryMessages: config.chat.maxHistoryMessages,
      defaultSystemPrompt: config.chat.defaultSystemPrompt,
      streamingChunkSize: config.chat.streamingChunkSize
    },

    // What-If Configuration
    whatIf: {
      defaultSystemPrompt: config.whatIf.defaultSystemPrompt
    },
    
    // File Processing Configuration
    fileProcessing: {
      maxFileSize: config.fileProcessing.maxFileSize,
      supportedFormats: config.fileProcessing.supportedFormats,
      maxFilesPerUpload: config.fileProcessing.maxFilesPerUpload,
      chunking: config.fileProcessing.chunking 
    },
    
    // Pagination Configuration
    pagination: {
      defaultPageSize: config.pagination.defaultPageSize,
      maxPageSize: config.pagination.maxPageSize,
      defaultPage: config.pagination.defaultPage
    },
    
    // API Configuration
    api: {
      timeout: config.api.timeout,
      retryAttempts: config.api.retryAttempts,
      retryDelay: config.api.retryDelay
    },
    
    // External Service URLs
    services: {
      supabaseServiceKey: config.supabaseServiceKey,
      openrouterApiKey: config.openrouterApiKey,
      ollamaApiUrl: config.ollamaApiUrl
    }
  }
}

/**
 * Get public configuration (client-side safe)
 * This function can be used in both client and server-side code
 */
export function usePublicConfig() {
  const config = useRuntimeConfig()
  
  return {
    // Public UI Configuration
    ui: {
      animationDuration: config.public.ui.animationDuration,
      debounceDelay: config.public.ui.debounceDelay,
      toastDuration: config.public.ui.toastDuration,
      mobileBreakpoint: config.public.ui.mobileBreakpoint
    },
    
    // Public Service URLs
    services: {
      supabaseUrl: config.public.supabaseUrl,
      supabaseAnonKey: config.public.supabaseAnonKey
    }
  }
}
