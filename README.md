# Trickster - AI-Powered Imagination Generator

**Trickster** is a multilingual local web application designed for single-user personal use. It enables users to create topics, incrementally upload long-form texts, chat with LLMs about the uploaded texts, and generate creative "What if" scenarios using RAG (Retrieval-Augmented Generation).

## 🎯 Core Philosophy

- **"What if" Spirit**: Encourage creative and speculative thinking
- **User Empowerment**: Tools for creative exploration
- **Multilingual Excellence**: Multilingual support throughout

## ✨ Key Features

- **Topic Management**: Create and organize thematic topics
- **Incremental Multi-File Processing**: Upload multiple long-form files (txt/markdown/html) per topic
- **Vector Storage**: Text embeddings for semantic search across all topic documents
- **Dual Interaction Modes**:
  - **Quick Chat Mode**: RAG-based chatbot with conversations stored in browser local storage
  - **What-If Mode**: Creative scenario generation with content stored in file system
- **Multilingual Support**: Full multilingual language support for text embeddings and generated content 

## 🏗️ Technology Stack

- **Frontend/Backend**: Nuxt.js 3 with TypeScript and SSR
- **Database**: Supabase (PostgreSQL) with pgvector extension
- **AI Services**: Ollama (`qwen3-embedding:8b`) + OpenRouter with OpenAI SDK
- **Storage**: Dual strategy - browser local storage (chat) + file system (What-If content)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Ollama (for embeddings)
- Supabase account (for database)
- OpenRouter API key (for LLM services)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration values
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   The application will be available at `http://127.0.0.1:3000`

## 🔧 Environment Configuration

Copy `.env.example` to `.env` and configure the following:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Ollama Configuration
OLLAMA_API_URL=http://localhost:11434
```

## 📁 Project Structure

```
├── app/                        # Nuxt.js app directory
│   ├── components/             # Vue.js components
│   │   ├── Chat/               # Quick Chat mode components
│   │   ├── FileManagement/     # File upload/list components
│   │   ├── Topic/              # Topic management components
│   │   └── WhatIf/             # What-If mode components
│   ├── composables/            # Vue.js composables
│   ├── layouts/                # Page layouts
│   ├── middleware/             # Route middleware
│   └── pages/                  # File-based routing
│       └── topics/             # Topic-related pages
│           └── [id]/           # Dynamic topic pages (chat, documents, what-if)
├── constants/                  # Application constants
├── docs/                       # Documentation
├── lib/                        # Core services and utilities
│   └── ai/                     # AI service integrations
│       ├── embedding-service   # Ollama embedding service
│       ├── llm-service         # OpenRouter LLM service
│       ├── vector-search       # Vector search operations
│       └── streaming-handler   # SSE streaming
├── public/                     # Static assets
├── server/api/                 # Server API routes
│   ├── ai/                     # AI testing endpoints
│   ├── chat/                   # Quick Chat functionality
│   ├── content/                # Content retrieval
│   ├── context/                # Context assembly
│   ├── database/               # Database testing
│   ├── documents/              # File upload and processing
│   ├── embeddings/             # Vector operations
│   ├── topics/                 # Topic CRUD operations
│   └── what-if/                # What-If generation
├── supabase/                   # Supabase configuration
│   └── migrations/             # Database migrations
├── types/                      # TypeScript type definitions
└── utils/                      # Utility functions
```

## 🛠️ Development

### Development Phases

This project follows an 9-phase development roadmap:

1. ✅ **Project Setup & Foundation** - Basic Nuxt.js setup and dependencies
2. ✅ **Database & Vector Storage Setup** - Supabase with pgvector
3. ✅ **AI Services Integration** - Ollama embeddings + OpenRouter LLM
4. ✅ **API Layer Development** - Server API routes
5. ✅ **Frontend Components** - Vue.js components
6. ✅ **Pages and Routing** - Topic-based routing
7. ✅ **UI Styling and Design** - Modern responsive design
8. ✅ **Integration Testing** - Manual testing

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

This is a personal project designed for single-user use. However, feedback and suggestions are welcome!

---

**Trickster** - Where imagination meets AI-powered creativity. 🎭✨
