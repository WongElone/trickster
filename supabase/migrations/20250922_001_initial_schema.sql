-- Trickster Database Schema
-- Initial migration for core tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Topics table: Store thematic topics for content organization
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT topics_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Documents table: Store multiple files per topic with metadata
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    format VARCHAR(10) NOT NULL CHECK (format IN ('txt', 'md', 'html', 'markdown')),
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT documents_filename_not_empty CHECK (LENGTH(TRIM(filename)) > 0),
    CONSTRAINT documents_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Embeddings table: Store vector embeddings for semantic search
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    vector VECTOR(768), -- EntropyYue/jina-embeddings-v2-base-zh dimension
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT embeddings_chunk_text_not_empty CHECK (LENGTH(TRIM(chunk_text)) > 0),
    CONSTRAINT embeddings_unique_chunk UNIQUE (document_id, chunk_index)
);

-- What-If scenarios table: Store metadata for generated creative content
CREATE TABLE what_ifs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    title VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    content_preview TEXT, -- First 500 chars for quick preview
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT what_ifs_prompt_not_empty CHECK (LENGTH(TRIM(prompt)) > 0),
    CONSTRAINT what_ifs_file_path_not_empty CHECK (LENGTH(TRIM(file_path)) > 0)
);

-- Create indexes for optimal query performance
CREATE INDEX idx_documents_topic_id ON documents(topic_id);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX idx_documents_format ON documents(format);

CREATE INDEX idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX idx_embeddings_vector_cosine ON embeddings USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_what_ifs_topic_id ON what_ifs(topic_id);
CREATE INDEX idx_what_ifs_created_at ON what_ifs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to topics table
CREATE TRIGGER update_topics_updated_at 
    BEFORE UPDATE ON topics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for single-user application
-- Since this is a single-user local application, we'll create permissive policies

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE what_ifs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single-user context)
CREATE POLICY "Allow all operations on topics" ON topics FOR ALL USING (true);
CREATE POLICY "Allow all operations on documents" ON documents FOR ALL USING (true);
CREATE POLICY "Allow all operations on embeddings" ON embeddings FOR ALL USING (true);
CREATE POLICY "Allow all operations on what_ifs" ON what_ifs FOR ALL USING (true);

-- Create a function to get topic statistics
CREATE OR REPLACE FUNCTION get_topic_stats(topic_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'document_count', COALESCE(doc_count, 0),
        'total_size_bytes', COALESCE(total_size, 0),
        'embedding_count', COALESCE(embed_count, 0),
        'what_if_count', COALESCE(whatif_count, 0),
        'last_document_upload', last_upload,
        'last_what_if_creation', last_whatif
    ) INTO result
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM documents WHERE topic_id = topic_uuid) as doc_count,
            (SELECT SUM(size_bytes) FROM documents WHERE topic_id = topic_uuid) as total_size,
            (SELECT COUNT(*) FROM embeddings e JOIN documents d ON e.document_id = d.id WHERE d.topic_id = topic_uuid) as embed_count,
            (SELECT COUNT(*) FROM what_ifs WHERE topic_id = topic_uuid) as whatif_count,
            (SELECT MAX(uploaded_at) FROM documents WHERE topic_id = topic_uuid) as last_upload,
            (SELECT MAX(created_at) FROM what_ifs WHERE topic_id = topic_uuid) as last_whatif
    ) stats;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
