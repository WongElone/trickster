-- Upgrade vector dimensions from 768 to 2048 using halfvec format
-- This migration will:
-- 1. Update embeddings table vector column from VECTOR(768) to HALFVEC(2048)
-- 2. Update vector search function to use halfvec(2048) type casting
-- 3. Recreate vector index for new dimensions using halfvec
-- 4. Update function permissions

-- Step 1: Drop existing vector index first (required before changing column type)
DROP INDEX IF EXISTS idx_embeddings_vector_cosine;

-- Step 2: Update embeddings table vector column to use halfvec format
-- halfvec supports up to 4000 dimensions and is more storage efficient
-- Note: Must drop index first as vector_cosine_ops doesn't work with halfvec
ALTER TABLE embeddings ALTER COLUMN vector TYPE HALFVEC(2048);

-- Step 3: Update vector search function
DROP FUNCTION IF EXISTS match_embeddings(text, double precision, integer);

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
      (1 - (embeddings.vector <=> query_embedding::halfvec(2048))) AS sim_score
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

-- Step 4: Recreate vector index for new dimensions using halfvec
-- Use hnsw index which works better with halfvec and higher dimensions
CREATE INDEX idx_embeddings_vector_cosine 
ON embeddings USING hnsw (vector halfvec_cosine_ops);

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION match_embeddings TO authenticated;

-- Step 6: Update create_match_embeddings_function to reflect new dimensions
CREATE OR REPLACE FUNCTION create_match_embeddings_function()
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT true; -- Function already created above with 2048 dimensions
$$;

GRANT EXECUTE ON FUNCTION create_match_embeddings_function TO authenticated;
