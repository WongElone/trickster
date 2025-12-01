-- Add topic_id to embeddings table and improve similarity search
-- Migration to support topic-scoped vector search

-- First, update vector column to use halfvec(2048) instead of vector(768)
ALTER TABLE embeddings 
ALTER COLUMN vector TYPE halfvec(2048);

-- Add topic_id column to embeddings table
ALTER TABLE embeddings 
ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;

-- Create index for topic_id for efficient filtering
CREATE INDEX idx_embeddings_topic_id ON embeddings(topic_id);

-- Update existing embeddings with topic_id from their documents
UPDATE embeddings 
SET topic_id = d.topic_id 
FROM documents d 
WHERE embeddings.document_id = d.id;

-- Make topic_id NOT NULL after populating existing data
ALTER TABLE embeddings 
ALTER COLUMN topic_id SET NOT NULL;

-- Create function that accepts pre-generated embedding and topic_id
CREATE OR REPLACE FUNCTION match_embeddings_by_topic(
  query_embedding text,
  topic_uuid uuid,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index integer,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH similarity_calc AS (
    SELECT
      embeddings.id,
      embeddings.document_id,
      embeddings.chunk_text,
      embeddings.chunk_index,
      (1 - (embeddings.vector <=> query_embedding::halfvec(2048))) AS sim_score
    FROM embeddings
    WHERE embeddings.vector IS NOT NULL
      AND embeddings.topic_id = topic_uuid
  )
  SELECT 
    id,
    document_id,
    chunk_text,
    chunk_index,
    sim_score::double precision AS similarity
  FROM similarity_calc
  WHERE sim_score > match_threshold
  ORDER BY sim_score DESC
  LIMIT match_count;
$$;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION match_embeddings_by_topic TO authenticated;

-- Update the vector indexes to use halfvec and include topic_id for better performance
DROP INDEX IF EXISTS idx_embeddings_vector_cosine;
DROP INDEX IF EXISTS idx_embeddings_vector_cosine_topic;

-- Create new indexes with halfvec
CREATE INDEX idx_embeddings_vector_cosine_halfvec 
ON embeddings USING hnsw (vector halfvec_cosine_ops);

-- Create composite index for topic_id and vector search with halfvec
CREATE INDEX idx_embeddings_topic_vector_halfvec 
ON embeddings (topic_id) 
INCLUDE (vector);
