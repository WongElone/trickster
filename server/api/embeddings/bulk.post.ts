/**
 * Embeddings API - Bulk processing endpoint
 * Generates embeddings for multiple documents or all documents in a topic
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { embeddingService } from '../../../lib/ai/embedding-service'
import { processDocumentForEmbeddings } from '../../../lib/document-processor'
import type { EmbeddingInsert } from '../../../types/database'

interface BulkEmbeddingsRequest {
  operation: 'generate' | 'regenerate'
  topicId?: string
  documentIds?: string[]
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
    const body = await readBody<BulkEmbeddingsRequest>(event)

    // Validate request
    if (!body.operation || !['generate', 'regenerate'].includes(body.operation)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Operation must be either "generate" or "regenerate"'
      })
    }

    if (!body.topicId && (!body.documentIds || body.documentIds.length === 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either topicId or documentIds must be provided'
      })
    }

    // Get documents to process
    let documentsQuery = supabase
      .from('documents')
      .select('*')

    if (body.topicId) {
      documentsQuery = documentsQuery.eq('topic_id', body.topicId)
    } else if (body.documentIds) {
      documentsQuery = documentsQuery.in('id', body.documentIds)
    }

    const { data: documents, error: docError } = await documentsQuery

    if (docError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch documents',
        data: docError
      })
    }

    if (!documents || documents.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No documents found'
      })
    }

    const results = {
      operation: body.operation,
      totalDocuments: documents.length,
      processedDocuments: 0,
      totalChunks: 0,
      totalEmbeddings: 0,
      errors: [] as string[],
      documentResults: [] as any[]
    }

    // Process each document
    for (const document of documents) {
      try {
        // Check if embeddings already exist
        const { data: existingEmbeddings, error: embError } = await supabase
          .from('embeddings')
          .select('id')
          .eq('document_id', document.id)
          .limit(1)

        const hasExistingEmbeddings = existingEmbeddings && existingEmbeddings.length > 0

        // Skip if embeddings exist and operation is 'generate'
        if (body.operation === 'generate' && hasExistingEmbeddings) {
          results.documentResults.push({
            documentId: document.id,
            filename: document.original_filename,
            status: 'skipped',
            reason: 'Embeddings already exist'
          })
          continue
        }

        // Delete existing embeddings if regenerating
        if (body.operation === 'regenerate' && hasExistingEmbeddings) {
          await supabase
            .from('embeddings')
            .delete()
            .eq('document_id', document.id)
        }

        // Process document into chunks
        const processedDoc = await processDocumentForEmbeddings(
          document.content,
          document.original_filename,
          body.chunkingOptions
        )

        if (processedDoc.chunks.length === 0) {
          results.errors.push(`Document ${document.original_filename}: No processable text chunks`)
          results.documentResults.push({
            documentId: document.id,
            filename: document.original_filename,
            status: 'failed',
            reason: 'No processable text chunks'
          })
          continue
        }

        // Generate embeddings for all chunks
        const chunkTexts = processedDoc.chunks.map(chunk => chunk.text)
        const embeddings = await embeddingService.generateEmbeddings(chunkTexts)

        // Prepare embedding data for database insertion
        const embeddingInserts: EmbeddingInsert[] = []
        let chunkErrors = 0

        for (let i = 0; i < processedDoc.chunks.length; i++) {
          const chunk = processedDoc.chunks[i]
          const embedding = embeddings[i]

          if (!chunk || !embedding || embedding.length === 0) {
            chunkErrors++
            continue
          }

          embeddingInserts.push({
            document_id: document.id,
            topic_id: document.topic_id,
            chunk_text: chunk.text,
            chunk_index: chunk.index,
            vector: embedding,
            created_at: new Date().toISOString()
          })
        }

        if (embeddingInserts.length === 0) {
          results.errors.push(`Document ${document.original_filename}: Failed to generate any embeddings`)
          results.documentResults.push({
            documentId: document.id,
            filename: document.original_filename,
            status: 'failed',
            reason: 'No valid embeddings generated'
          })
          continue
        }

        // Insert embeddings into database
        const { data: insertedEmbeddings, error: insertError } = await supabase
          .from('embeddings')
          .insert(embeddingInserts)
          .select()

        if (insertError) {
          console.error(`Error inserting embeddings for document ${document.id}:`, insertError)
          results.errors.push(`Document ${document.original_filename}: Database insertion failed`)
          results.documentResults.push({
            documentId: document.id,
            filename: document.original_filename,
            status: 'failed',
            reason: 'Database insertion failed'
          })
          continue
        }

        // Update document processed_at timestamp
        await supabase
          .from('documents')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', document.id)

        // Record success
        results.processedDocuments++
        results.totalChunks += processedDoc.chunks.length
        results.totalEmbeddings += insertedEmbeddings?.length || 0

        results.documentResults.push({
          documentId: document.id,
          filename: document.original_filename,
          status: 'success',
          chunksProcessed: processedDoc.chunks.length,
          embeddingsGenerated: embeddingInserts.length,
          embeddingsStored: insertedEmbeddings?.length || 0,
          chunkErrors: chunkErrors > 0 ? chunkErrors : undefined
        })

        // Add small delay between documents to avoid overwhelming the system
        if (documents.indexOf(document) < documents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }

      } catch (docError) {
        console.error(`Error processing document ${document.id}:`, docError)
        const errorMessage = docError instanceof Error ? docError.message : 'Unknown error'
        results.errors.push(`Document ${document.original_filename}: ${errorMessage}`)
        results.documentResults.push({
          documentId: document.id,
          filename: document.original_filename,
          status: 'failed',
          reason: errorMessage
        })
      }
    }

    return {
      success: results.processedDocuments > 0,
      ...results,
      summary: {
        successRate: results.totalDocuments > 0 ? (results.processedDocuments / results.totalDocuments * 100).toFixed(1) + '%' : '0%',
        avgChunksPerDocument: results.processedDocuments > 0 ? Math.round(results.totalChunks / results.processedDocuments) : 0,
        avgEmbeddingsPerDocument: results.processedDocuments > 0 ? Math.round(results.totalEmbeddings / results.processedDocuments) : 0
      }
    }

  } catch (error) {
    console.error('Error in bulk embeddings processing:', error)
    
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
