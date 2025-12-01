# Database Setup Guide for Trickster

## 📋 Prerequisites Completed

✅ Supabase project created  
✅ Environment variables configured  
✅ pgvector extension enabled  

## 🗄️ Database Schema Setup

### Method 1: Direct SQL Execution (Recommended)

1. **Open Supabase SQL Editor**:
   - Go to your Supabase dashboard
   - Navigate to **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Execute the Migration**:
   - Run all migration sql files in `supabase/migrations/`

3. **Verify Tables Created**:
   - Go to **Database** → **Tables**
   - You should see 4 new tables:
     - `topics`
     - `documents` 
     - `embeddings`
     - `what_ifs`

### Method 2: Using Supabase CLI (Alternative)

If you prefer using the CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project reference)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## 🧪 Test Database Connection

After setting up the database schema:

1. **Start your Nuxt application**:
   ```bash
   npm run dev-windows
   ```

2. **Test the connection**:
   - Open your browser to `http://127.0.0.1:3000/api/database/test`
   - You should see a JSON response with `"success": true`
   - This confirms your database is properly configured

## 📊 Database Schema Overview

### Tables Created:

1. **`topics`** - Store thematic topics
   - `id` (UUID, Primary Key)
   - `title` (VARCHAR, Required)
   - `description` (TEXT, Optional)
   - `created_at`, `updated_at` (Timestamps)

2. **`documents`** - Store uploaded files per topic
   - `id` (UUID, Primary Key)
   - `topic_id` (UUID, Foreign Key → topics)
   - `filename`, `original_filename` (VARCHAR)
   - `content` (TEXT, File content)
   - `format` (VARCHAR, File type: txt/md/html/markdown)
   - `size_bytes` (INTEGER)
   - `uploaded_at`, `processed_at` (Timestamps)

3. **`embeddings`** - Store vector embeddings for semantic search
   - `id` (UUID, Primary Key)
   - `document_id` (UUID, Foreign Key → documents)
   - `chunk_text` (TEXT, Text chunk)
   - `chunk_index` (INTEGER, Chunk position)
   - `vector` (VECTOR(768), Embedding vector)
   - `created_at` (Timestamp)

4. **`what_ifs`** - Store What-If scenario metadata
   - `id` (UUID, Primary Key)
   - `topic_id` (UUID, Foreign Key → topics)
   - `prompt` (TEXT, User input)
   - `title` (VARCHAR, Optional)
   - `file_path` (VARCHAR, File system path)
   - `content_preview` (TEXT, First 500 chars)
   - `word_count` (INTEGER)
   - `created_at` (Timestamp)

### Indexes Created:
- Performance indexes on foreign keys
- Vector similarity search index (IVFFlat)
- Timestamp indexes for sorting

### Security:
- Row Level Security (RLS) enabled on all tables
- Permissive policies for single-user application
- UUID primary keys for security

## 🔧 Troubleshooting

### Common Issues:

1. **"relation does not exist" error**:
   - Ensure you ran the migration SQL in the correct database
   - Check that all tables were created in the `public` schema

2. **Vector extension not found**:
   - Verify pgvector extension is enabled in Supabase Extensions
   - Re-run the migration after enabling the extension

3. **Connection timeout**:
   - Check your environment variables are correct
   - Verify your Supabase project is active and not paused

4. **Permission denied**:
   - Ensure you're using the correct API keys
   - Check that RLS policies are properly configured

### Verification Queries:

Test these in the Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('topics', 'documents', 'embeddings', 'what_ifs');

-- Test vector extension
SELECT vector_dims(vector) FROM embeddings LIMIT 1;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename IN ('topics', 'documents', 'embeddings', 'what_ifs');
```

## ✅ Next Steps

Once database setup is complete:
1. Test the `/api/database/test` endpoint
2. Proceed to **Phase 3: AI Services Integration**
3. The database is ready for topic management and document storage

---

**Database setup complete!** 🎉 Your Trickster application now has a robust PostgreSQL database with vector search capabilities.
