/**
 * Embeddings API - POST endpoint for manual embedding creation
 * Creates embeddings for a specific document
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { embeddingService } from '../../../lib/ai/embedding-service'
import { langChainTextChunker } from '../../../lib/ai/langchain-text-chunker'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody(event)
    
    const { documentId, topicId } = body

    if (!documentId || !topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Document ID and Topic ID are required'
      })
    }

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('topic_id', topicId)
      .single()

    if (docError) {
      if (docError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Document not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch document',
        data: docError
      })
    }

    // Check if document is already being processed or completed
    if (document.embedding_status === 'processing') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Document is already being processed'
      })
    }

    if (document.embedding_status === 'completed') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Document embeddings already exist'
      })
    }

    // Update status to processing
    const { error: updateError } = await supabase
      .from('documents')
      .update({ embedding_status: 'processing' })
      .eq('id', documentId)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update document status',
        data: updateError
      })
    }

    try {
      // Delete existing embeddings for this document (in case of retry)
      await supabase
        .from('embeddings')
        .delete()
        .eq('document_id', documentId)

      // Chunk the document content
      const chunks = await langChainTextChunker.chunkText(document.content, documentId)

      // Generate embeddings for each chunk
      const embeddingPromises = chunks.map(async (chunk, index) => {
        const embedding = await embeddingService.generateEmbedding(chunk.text)
        
        return {
          document_id: documentId,
          topic_id: topicId,
          chunk_text: chunk.text,
          chunk_index: index,
          vector: embedding
        }
      })

      const embeddings = await Promise.all(embeddingPromises)

      // Insert embeddings into database
      const { error: embeddingError } = await supabase
        .from('embeddings')
        .insert(embeddings)

      if (embeddingError) {
        throw embeddingError
      }

      // Update document status to completed
      const { error: completeError } = await supabase
        .from('documents')
        .update({ 
          embedding_status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (completeError) {
        console.error('Failed to update document to completed status:', completeError)
        // Don't throw here as embeddings were created successfully
      }

      return {
        success: true,
        message: 'Embeddings created successfully',
        documentId,
        embeddingCount: embeddings.length
      }

    } catch (embeddingError) {
      console.error('Error creating embeddings:', embeddingError)
      
      // Update status to failed
      await supabase
        .from('documents')
        .update({ embedding_status: 'failed' })
        .eq('id', documentId)

      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create embeddings',
        data: embeddingError
      })
    }

  } catch (error) {
    console.error('Error in embeddings create endpoint:', error)
    
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
