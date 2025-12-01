/**
 * Documents API - POST endpoint
 * Handles incremental multi-file upload for topics
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { DocumentInsert } from '../../../types/database'
import { processFile, validateFileSize, generateSafeFilename, isSupportedFormat } from '../../../utils/file-handlers'

interface UploadDocumentRequest {
  topicId: string
  files: Array<{
    filename: string
    content: string // Base64 encoded content
    mimeType?: string
  }>
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<UploadDocumentRequest>(event)

    // Validate request
    if (!body.topicId || !body.files || !Array.isArray(body.files) || body.files.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID and files array are required'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title')
      .eq('id', body.topicId)
      .single()

    if (topicError) {
      if (topicError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Topic not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify topic',
        data: topicError
      })
    }

    const processedDocuments = []
    const errors = []

    // Process each file
    for (let i = 0; i < body.files.length; i++) {
      const file = body.files[i]
      
      try {
        // Validate file exists
        if (!file) {
          errors.push(`File ${i + 1}: File data is missing`)
          continue
        }
        
        // Validate file
        if (!file.filename || !file.content) {
          errors.push(`File ${i + 1}: Filename and content are required`)
          continue
        }

        // Decode base64 content
        let fileContent: string
        try {
          fileContent = Buffer.from(file.content, 'base64').toString('utf8')
        } catch (decodeError) {
          errors.push(`File ${i + 1}: Invalid base64 content`)
          continue
        }

        // Validate file size
        const sizeBytes = Buffer.byteLength(fileContent, 'utf8')
        if (!validateFileSize(sizeBytes)) {
          errors.push(`File ${i + 1}: File size exceeds 10MB limit`)
          continue
        }

        // Process file based on format
        const processedFile = processFile(fileContent, file.filename)
        
        // Generate safe filename for storage
        const safeFilename = generateSafeFilename(file.filename, body.topicId)

        // Prepare document data
        const documentData: DocumentInsert = {
          topic_id: body.topicId,
          filename: safeFilename,
          original_filename: file.filename,
          content: processedFile.content,
          format: processedFile.format,
          size_bytes: processedFile.sizeBytes,
          uploaded_at: new Date().toISOString(),
          processed_at: new Date().toISOString()
        }

        // Insert document into database
        const { data: document, error: insertError } = await supabase
          .from('documents')
          .insert(documentData)
          .select()
          .single()

        if (insertError) {
          console.error(`Error inserting document ${file.filename}:`, insertError)
          errors.push(`File ${i + 1}: Failed to save document - ${insertError.message}`)
          continue
        }

        processedDocuments.push({
          document,
          metadata: processedFile.metadata
        })

      } catch (fileError) {
        console.error(`Error processing file ${file?.filename}:`, fileError)
        errors.push(`File ${i + 1}: ${fileError instanceof Error ? fileError.message : 'Processing failed'}`)
      }
    }

    // Return results
    const response = {
      success: processedDocuments.length > 0,
      topicId: body.topicId,
      topicTitle: topic.title,
      processedCount: processedDocuments.length,
      totalCount: body.files.length,
      documents: processedDocuments,
      errors: errors.length > 0 ? errors : undefined,
      embeddingProcessing: {
        message: 'Documents uploaded successfully. Embeddings will be processed automatically.',
        documentsForEmbedding: processedDocuments.map(doc => doc.document.id)
      }
    }

    if (processedDocuments.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No files were successfully processed',
        data: { errors }
      })
    }

    // Trigger automatic embedding processing in the background
    // Note: In a production environment, this could be handled by a queue system
    try {
      const documentIds = processedDocuments.map(doc => doc.document.id)
      
      // Call the auto-process endpoint asynchronously
      $fetch('/api/embeddings/auto-process', {
        method: 'POST',
        body: {
          topicId: body.topicId,
          maxDocuments: documentIds.length
        }
      }).catch(embeddingError => {
        console.error('Background embedding processing failed:', embeddingError)
        // Don't fail the main request if embedding processing fails
      })
      
      response.embeddingProcessing.message = 'Documents uploaded successfully. Embedding processing started automatically.'
    } catch (embeddingError) {
      console.error('Failed to trigger automatic embedding processing:', embeddingError)
      response.embeddingProcessing.message = 'Documents uploaded successfully. Please manually trigger embedding processing.'
    }

    return response

  } catch (error) {
    console.error('Error uploading documents:', error)
    
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
