-- Modify what_ifs table for Supabase storage approach
-- Remove file system related columns and add content column

-- Add content column for storing generated what-if content
ALTER TABLE what_ifs ADD COLUMN content TEXT;

-- Drop file system related columns
ALTER TABLE what_ifs DROP COLUMN file_path;
ALTER TABLE what_ifs DROP COLUMN content_preview;

-- Update constraints since file_path is no longer required
-- The prompt constraint remains as it's still needed

-- Update the get_topic_stats function to work without file_path dependency
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
