-- Vector search function for similarity matching
-- This function enables efficient vector similarity search using pgvector

-- Create the match_embeddings function for vector similarity search
-- Simplified version to avoid query planner issues with LIMIT
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding text,
  match_threshold double precision,
  match_count integer
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
      (1 - (embeddings.vector <=> query_embedding::vector(768))) AS sim_score
    FROM embeddings
    WHERE embeddings.vector IS NOT NULL
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

-- Create function to help with vector search function creation from API
CREATE OR REPLACE FUNCTION create_match_embeddings_function()
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT true;
$$;

-- Create index for better vector search performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_cosine 
ON embeddings USING ivfflat (vector vector_cosine_ops) 
WITH (lists = 100);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION match_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION create_match_embeddings_function TO authenticated;
