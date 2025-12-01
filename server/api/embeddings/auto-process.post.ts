/**
 * Embeddings API - Auto-process endpoint
 * Automatically generates embeddings for documents that don't have them yet
 * This endpoint can be called after document uploads to ensure embeddings are created
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { embeddingService } from '../../../lib/ai/embedding-service'
import { processDocumentForEmbeddings } from '../../../lib/document-processor'
import type { EmbeddingInsert } from '../../../types/database'

interface AutoProcessRequest {
  topicId?: string
  documentId?: string
  maxDocuments?: number
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
    const body = await readBody<AutoProcessRequest>(event)

    const maxDocuments = Math.min(body.maxDocuments || 10, 50) // Limit to prevent overwhelming

    // Find documents without embeddings
    let query = supabase
      .from('documents')
      .select(`
        *,
        embeddings!left (
          id
        )
      `)
      .is('embeddings.id', null) // Documents with no embeddings
      .order('uploaded_at', { ascending: true }) // Process oldest first
      .limit(maxDocuments)

    // Apply filters
    if (body.documentId) {
      query = query.eq('id', body.documentId)
    } else if (body.topicId) {
      query = query.eq('topic_id', body.topicId)
    }

    const { data: documentsWithoutEmbeddings, error: queryError } = await query

    if (queryError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to find documents without embeddings',
        data: queryError
      })
    }

    if (!documentsWithoutEmbeddings || documentsWithoutEmbeddings.length === 0) {
      return {
        success: true,
        message: 'No documents found that need embedding processing',
        processedDocuments: 0,
        totalDocuments: 0
      }
    }

    const results = {
      totalDocuments: documentsWithoutEmbeddings.length,
      processedDocuments: 0,
      totalChunks: 0,
      totalEmbeddings: 0,
      errors: [] as string[],
      documentResults: [] as any[]
    }

    // Process each document
    for (const document of documentsWithoutEmbeddings) {
      try {
        console.log(`Auto-processing embeddings for document: ${document.original_filename}`)

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

        console.log(`Successfully processed embeddings for: ${document.original_filename}`)

        // Add small delay between documents to avoid overwhelming the system
        if (documentsWithoutEmbeddings.indexOf(document) < documentsWithoutEmbeddings.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }

      } catch (docError) {
        console.error(`Error auto-processing document ${document.id}:`, docError)
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
      message: `Auto-processed ${results.processedDocuments} of ${results.totalDocuments} documents`,
      ...results,
      summary: {
        successRate: results.totalDocuments > 0 ? (results.processedDocuments / results.totalDocuments * 100).toFixed(1) + '%' : '0%',
        avgChunksPerDocument: results.processedDocuments > 0 ? Math.round(results.totalChunks / results.processedDocuments) : 0,
        avgEmbeddingsPerDocument: results.processedDocuments > 0 ? Math.round(results.totalEmbeddings / results.processedDocuments) : 0
      }
    }

  } catch (error) {
    console.error('Error in auto-process embeddings:', error)
    
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
