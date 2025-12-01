# Trickster - AI-Powered Imagination Generator

**Trickster** is a bilingual (English/Chinese) local web application designed for single-user personal use. It enables users to create topics, incrementally upload long-form texts, and generate creative "What if" scenarios using RAG (Retrieval-Augmented Generation) and Large Language Models.

## 🎯 Core Philosophy

- **"What if" Spirit**: Encourage creative and speculative thinking
- **User Empowerment**: Tools for creative exploration
- **Bilingual Excellence**: Native Chinese/English support throughout

## ✨ Key Features

- **Topic Management**: Create and organize thematic topics
- **Incremental Multi-File Processing**: Upload multiple long-form files (txt/markdown/html) per topic
- **Vector Storage**: Text embeddings for semantic search across all topic documents
- **Dual Interaction Modes**:
  - **Quick Chat Mode**: RAG-based chatbot with conversations stored in browser local storage
  - **What-If Mode**: Creative scenario generation with content stored in file system
- **Bilingual Support**: Full Chinese/English language support

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
   npm run dev-windows
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
├── components/          # Vue.js components
│   ├── Topic/          # Topic management components
│   ├── Chat/           # Quick Chat mode components
│   ├── WhatIf/         # What-If mode components
│   └── FileManagement/ # File upload components
├── pages/              # Nuxt.js pages (file-based routing)
│   └── topics/         # Topic-related pages
├── server/api/         # Server API routes
│   ├── topics/         # Topic CRUD operations
│   ├── documents/      # File upload and processing
│   ├── embeddings/     # Vector operations
│   ├── chat/           # Quick Chat functionality
│   ├── what-if/        # What-If generation
│   └── content/        # Content retrieval
├── composables/        # Vue.js composables
├── utils/              # Utility functions
├── constants/          # Application constants
└── types/              # TypeScript type definitions
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run dev-windows` - Start development server (Windows optimized)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Development Phases

This project follows an 11-phase development roadmap:

1. ✅ **Project Setup & Foundation** - Basic Nuxt.js setup and dependencies
2. 🔄 **Database & Vector Storage Setup** - Supabase with pgvector
3. 🔄 **AI Services Integration** - Ollama embeddings + OpenRouter LLM
4. 🔄 **API Layer Development** - Server API routes
5. 🔄 **Frontend Components** - Vue.js components
6. 🔄 **Pages and Routing** - File-based routing
7. 🔄 **Data Storage Management** - Local storage + file system
8. 🔄 **Composables and Utilities** - Shared functionality
9. 🔄 **UI Styling and Design** - Modern responsive design
10. 🔄 **Integration Testing** - Manual testing
11. 🔄 **Deployment and Production** - Production setup

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

This is a personal project designed for single-user use. However, feedback and suggestions are welcome!

---

**Trickster** - Where imagination meets AI-powered creativity. 🎭✨


## 📚 Reference
- [Assign gpu to docker](https://stackoverflow.com/questions/25185405/using-gpu-from-a-docker-container)