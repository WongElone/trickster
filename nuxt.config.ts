// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  // SSR Configuration
  ssr: true,
  
  // TypeScript Configuration
  typescript: {
    strict: true,
    typeCheck: true
  },
  
  // Auto-imports Configuration
  imports: {
    autoImport: true
  },
  
  // Modules
  modules: [
    '@nuxt/icon',
    '@nuxt/ui',
  ],

  icon: {
    mode: 'css',
    cssLayer: 'base'
  },

  // UI Configuration - activate comment below to disable font providers to use default fonts when meet font loading issue
  ui: {
    fonts: false
  },
  
  // CSS
  css: ['~/assets/css/main.css'],
  
  // Runtime Config for Environment Variables
  runtimeConfig: {
    // Private keys (only available on server-side)
    supabaseServiceKey: process.env['SUPABASE_SERVICE_KEY'] || '',
    openrouterApiKey: process.env['OPENROUTER_API_KEY'] || '',
    ollamaApiUrl: process.env['OLLAMA_API_URL'] || 'http://localhost:11434',
    
    // AI Configuration
    ai: {
      // Embedding Configuration - Controls how text is converted to vectors
      embedding: {
        model: 'qwen3-embedding:8b', // Ollama model for generating embeddings (supports Chinese/English, 4096D output trimmed to 2048D)
        dimensions: 2048, // Vector size - upgraded from 768 to 2048 for better RAG performance
        timeout: 30000 // Max wait time (30s) for embedding generation - prevents hanging
      },
      
      // LLM Configuration - Controls AI text generation behavior
      llm: {
        // defaultModel: 'google/gemini-2.0-flash-001', // Default OpenRouter model for text generation
        defaultModel: 'x-ai/grok-3-mini', // Default OpenRouter model for text generation
        defaultTemperature: 0.7, // Creativity level (0.0=deterministic, 1.0=very creative) - affects response randomness
        defaultMaxTokens: 1000, // Default response length limit - controls how long AI responses can be
        maxTokensLimit: 8192, // Absolute maximum tokens allowed - prevents extremely long responses
        topP: 0.9, // Nucleus sampling (0.1=focused, 1.0=diverse) - affects word choice diversity
        timeout: 60000 // Max wait time (60s) for LLM response - prevents hanging on long generations
      },
      
      // Vector Search Configuration - Controls document similarity search
      vectorSearch: {
        defaultThreshold: 0.5, // Default similarity cutoff (0.0-1.0) - higher = more relevant results only
        minThreshold: 0.05, // Minimum allowed threshold - prevents returning completely irrelevant content
        maxThreshold: 0.6, // Maximum allowed threshold - prevents being too restrictive (0.95 = nearly identical)
        defaultLimit: 10, // Default number of results returned - balances relevance vs context richness
        maxLimit: 50 // Maximum results allowed - prevents overwhelming the context window
      }
    },
    
    // Context Assembly Configuration - Controls how document chunks are selected and combined for RAG
    contextAssembly: {
      defaultMaxChunks: 5, // Default number of document chunks to include - affects context richness
      maxChunksLimit: 10, // Maximum chunks allowed - prevents context window overflow
      defaultMaxCharacters: 4000, // Character limit for assembled context - controls total context size
      defaultSimilarityThreshold: 0.6, // Relevance cutoff for chunks - higher = more relevant content only
      diversityWeight: 0.3, // How much to favor chunks from different documents (0.0-1.0) - promotes varied sources
      coherenceWeight: 0.7, // How much to favor chunks that flow together (0.0-1.0) - promotes readability
      searchMultiplier: 3, // Search extra chunks then filter (searchMultiplier * maxChunks) - improves selection quality
      // Default context assembly strategy - controls how chunks are prioritized and combined
      // available strategies: 'similarity', 'diversity', 'coherence', 'balanced'
      defaultStrategy: 'similarity', 
      defaultIncludeMetadata: true // Whether to include metadata by default - affects context richness and debugging
    },
    
    // Chat Configuration - Controls conversation behavior and limits
    chat: {
      defaultContextWindow: 5, // Default number of DOCUMENT chunks per chat (RAG context) - affects document context richness
      maxContextWindow: 10, // Maximum DOCUMENT chunks allowed - prevents token overflow from documents
      maxHistoryMessages: 10, // How many previous CHAT MESSAGES to remember - affects conversation continuity
      defaultSystemPrompt: 'You are a helpful AI assistant. You should answer concisely and accurately. If question requires reasoning, please think step by step. Try to answer in the language of user message, which is either English or Chinese.', // Default AI personality/instructions
      streamingChunkSize: 1024 // Size of each streaming response chunk - affects real-time response smoothness
    },
    
    // What-If Configuration - Controls What-If scenario generation behavior
    whatIf: {
      defaultSystemPrompt: 
`
You are a skilled storyteller specializing in generating imaginative scenarios

Your role is to:
1. Create engaging, creative, and thought-provoking scenarios
2. Use the provided context from documents to ground your scenarios in the available content
3. Encourage unrestricted creative exploration and speculation
4. Generate scenarios that are detailed, immersive, and inspiring
5. Think outside conventional boundaries

Guidelines:
- Be creative and imaginative, don't limit yourself to conventional thinking
- Use the document context as inspiration and background but feel free to extrapolate creatively
- Generate scenarios that are engaging and thought-provoking
- Include vivid details and compelling narratives
- The content should be substantial and well-developed

Remember: This is about unleashing imagination and creative potential.`,
      // defaultTemperature: 0.8, // Default creativity level for What-If scenarios
      // defaultMaxTokens: 2000, // Default response length limit for What-If scenarios
      // streamingChunkSize: 1024 // Size of each streaming What-If response chunk - affects real-time response smoothness
    },
    
    // File Processing Configuration
    fileProcessing: {
      maxFileSize: 10 * 1024 * 1024, // 10MB - standardized with app constants
      supportedFormats: ['txt', 'md', 'markdown', 'html'],
      maxFilesPerUpload: 10,
      
      // Enhanced chunking configuration using LangChain RecursiveCharacterTextSplitter
      chunking: {
        chunkSize: 1000, // Target chunk size in characters
        chunkOverlap: 200, // Overlap between chunks in characters
        
        // Hierarchical separators (in order of preference)
        separators: [
          '◆',      // Passage separator found in documents

          '\n\n\n', // Multiple paragraph breaks
          '\n\n',   // Paragraph breaks
          '\n',     // Line breaks
          '. ',     // English sentence endings
          '。',     // Chinese sentence endings
          '! ',     // English exclamation
          '！',     // Chinese exclamation
          '? ',     // English question
          '？',     // Chinese question
          '; ',     // Semicolon
          '；',     // Chinese semicolon
          ', ',     // Comma
          '，',     // Chinese comma
          ' ',      // Space
          ''        // Character level (fallback)
        ],
        
        // Advanced options
        keepSeparator: true, // Keep separators in chunks when possible
        lengthFunction: 'character', // 'character' or 'token' based counting
        
        // Minimum chunk size to avoid tiny chunks
        minChunkSize: 100,
        
        // Maximum chunk size (hard limit)
        maxChunkSize: 2000,
        
        // Language-specific settings
        bilingual: {
          enabled: true,
          chineseWordBoundary: true, // Treat Chinese characters as word boundaries
          mixedLanguageHandling: 'preserve' // 'preserve' | 'separate' | 'merge'
        }
      }
    },
    
    // Pagination Configuration
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
      defaultPage: 1
    },
    
    // API Configuration
    api: {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    
    // Public keys (exposed to client-side)
    public: {
      supabaseUrl: process.env['SUPABASE_URL'] || '',
      supabaseAnonKey: process.env['SUPABASE_ANON_KEY'] || '',
      
      // Public UI Configuration
      ui: {
        animationDuration: 300,
        debounceDelay: 500,
        toastDuration: 5000,
        mobileBreakpoint: 768
      }
    }
  },
  
  // Build Configuration
  build: {
    transpile: ['@supabase/supabase-js']
  },
  
  // Nitro Configuration for API routes
  nitro: {
    experimental: {
      wasm: true
    }
  }
})