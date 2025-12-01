/**
 * Embeddings API - POST endpoint
 * Generates embeddings for document chunks and stores them in the database
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { embeddingService } from '../../../lib/ai/embedding-service'
import { processDocumentForEmbeddings } from '../../../lib/document-processor'
import type { EmbeddingInsert } from '../../../types/database'

interface GenerateEmbeddingsRequest {
  documentId: string
  forceRegenerate?: boolean
  chunkingOptions?: {
    maxChunkSize?: number
    overlapSize?: number
    preserveSentences?: boolean
    minChunkSize?: number
  }
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<GenerateEmbeddingsRequest>(event)

    // Validate request
    if (!body.documentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Document ID is required'
      })
    }

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', body.documentId)
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

    // Check if embeddings already exist
    if (!body.forceRegenerate) {
      const { data: existingEmbeddings, error: embError } = await supabase
        .from('embeddings')
        .select('id')
        .eq('document_id', body.documentId)
        .limit(1)

      if (embError) {
        console.error('Error checking existing embeddings:', embError)
      } else if (existingEmbeddings && existingEmbeddings.length > 0) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Embeddings already exist for this document. Use forceRegenerate=true to recreate them.'
        })
      }
    }

    // If force regenerate, delete existing embeddings
    if (body.forceRegenerate) {
      const { error: deleteError } = await supabase
        .from('embeddings')
        .delete()
        .eq('document_id', body.documentId)

      if (deleteError) {
        console.error('Error deleting existing embeddings:', deleteError)
        // Continue anyway
      }
    }

    // Process document into chunks
    const processedDoc = await processDocumentForEmbeddings(
      document.content,
      document.original_filename,
      body.chunkingOptions
    )

    if (processedDoc.chunks.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Document contains no processable text chunks'
      })
    }

    // Generate embeddings for all chunks
    const chunkTexts = processedDoc.chunks.map(chunk => chunk.text)
    const embeddings = await embeddingService.generateEmbeddings(chunkTexts)

    // Prepare embedding data for database insertion
    const embeddingInserts: EmbeddingInsert[] = []
    const errors: string[] = []

    for (let i = 0; i < processedDoc.chunks.length; i++) {
      const chunk = processedDoc.chunks[i]
      const embedding = embeddings[i]

      if (!chunk || !embedding || embedding.length === 0) {
        errors.push(`Failed to generate embedding for chunk ${i + 1}`)
        continue
      }

      embeddingInserts.push({
        document_id: body.documentId,
        topic_id: document.topic_id,
        chunk_text: chunk.text,
        chunk_index: chunk.index,
        vector: embedding,
        created_at: new Date().toISOString()
      })
    }

    if (embeddingInserts.length === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate any embeddings',
        data: { errors }
      })
    }

    // Insert embeddings into database
    const { data: insertedEmbeddings, error: insertError } = await supabase
      .from('embeddings')
      .insert(embeddingInserts)
      .select()

    if (insertError) {
      console.error('Error inserting embeddings:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to store embeddings',
        data: insertError
      })
    }

    // Update document processed_at timestamp
    await supabase
      .from('documents')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', body.documentId)

    return {
      success: true,
      documentId: body.documentId,
      chunksProcessed: processedDoc.chunks.length,
      embeddingsGenerated: embeddingInserts.length,
      embeddingsStored: insertedEmbeddings?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      processingStats: {
        originalSize: document.size_bytes,
        totalChunks: processedDoc.chunks.length,
        avgChunkSize: Math.round(
          processedDoc.chunks.reduce((sum, chunk) => sum + chunk.characterCount, 0) / processedDoc.chunks.length
        ),
        format: document.format
      }
    }

  } catch (error) {
    console.error('Error generating embeddings:', error)
    
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
