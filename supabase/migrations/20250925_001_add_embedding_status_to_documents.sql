-- Add embedding_status column to documents table
-- This tracks the status of embedding generation for each document

-- Add the embedding_status column with default value
ALTER TABLE documents 
ADD COLUMN embedding_status TEXT NOT NULL DEFAULT 'pending' 
CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add index for efficient querying by embedding status
CREATE INDEX idx_documents_embedding_status ON documents(embedding_status);

-- Add index for efficient querying by topic_id and embedding_status
CREATE INDEX idx_documents_topic_embedding_status ON documents(topic_id, embedding_status);

-- Update existing documents to have 'completed' status if they have embeddings
UPDATE documents 
SET embedding_status = 'completed' 
WHERE id IN (
    SELECT DISTINCT document_id 
    FROM embeddings 
    WHERE document_id = documents.id
);

-- Add comment to explain the column
COMMENT ON COLUMN documents.embedding_status IS 'Status of embedding generation: pending, processing, completed, failed';
