/**
 * Documents API - POST endpoint for multipart/form-data uploads
 * Handles file uploads using multipart/form-data format (for Postman/browser testing)
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { DocumentInsert } from '../../../types/database'
import { processFile, validateFileSize, generateSafeFilename, isSupportedFormat } from '../../../utils/file-handlers'
import formidable, { File } from 'formidable';
import { promises as fs } from 'fs'
import { useServerConfig } from '../../../lib/config'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const config = useServerConfig()

    // Parse multipart form data
    const form = formidable({
      maxFileSize: config.fileProcessing.maxFileSize,
      maxFiles: config.fileProcessing.maxFilesPerUpload,
      allowEmptyFiles: false,
      filter: function({ name, originalFilename }) {
        // Only allow supported file types
        if (name === 'files' && originalFilename) {
          const isSupported = isSupportedFormat(originalFilename)
          console.debug('File format check:', originalFilename, 'supported:', isSupported)
          return isSupported
        }
        return name === 'topicId' // Allow topicId field
      }
    })

    const [fields, files] = await form.parse(event.node.req)

    // Extract topicId
    const topicId = Array.isArray(fields['topicId']) ? fields['topicId'][0] : fields['topicId']
    if (!topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Extract files
    const uploadedFiles = files['files'] || []
    
    const fileArray: File[] = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles]
    
    if (fileArray.length === 0 || (fileArray.length === 1 && !fileArray[0])) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one file is required'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title')
      .eq('id', topicId)
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

    // Process each uploaded file
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      
      try {
        if (!file || !file.filepath || !file.originalFilename) {
          errors.push(`File ${i + 1}: Invalid file data`)
          continue
        }

        // Read file content
        const fileContent = await fs.readFile(file.filepath, 'utf8')
        
        // Validate file size
        const sizeBytes = Buffer.byteLength(fileContent, 'utf8')
        if (!validateFileSize(sizeBytes)) {
          errors.push(`File ${i + 1} (${file.originalFilename}): File size exceeds 50MB limit`)
          continue
        }

        // Check if file format is supported
        if (!isSupportedFormat(file.originalFilename)) {
          errors.push(`File ${i + 1} (${file.originalFilename}): Unsupported file format. Supported: .txt, .md, .html`)
          continue
        }

        // Process file based on format
        const processedFile = processFile(fileContent, file.originalFilename)
        
        // Generate safe filename for storage
        const safeFilename = generateSafeFilename(file.originalFilename, topicId)

        // Prepare document data
        const documentData: DocumentInsert = {
          topic_id: topicId,
          filename: safeFilename,
          original_filename: file.originalFilename,
          content: processedFile.content,
          format: processedFile.format,
          size_bytes: sizeBytes,
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
          errors.push(`File ${i + 1} (${file.originalFilename}): Database insertion failed - ${insertError.message}`)
          continue
        }

        processedDocuments.push({
          id: document.id,
          filename: document.filename,
          originalFilename: document.original_filename,
          format: document.format,
          sizeBytes: document.size_bytes,
          uploadedAt: document.uploaded_at
        })

        // Clean up temporary file
        try {
          await fs.unlink(file.filepath)
        } catch (cleanupError) {
          console.warn(`Failed to clean up temporary file: ${file.filepath}`)
        }

      } catch (fileError) {
        errors.push(`File ${i + 1} (${file?.originalFilename || 'unknown'}): Processing failed - ${(fileError as Error).message}`)
        continue
      }
    }

    // Check if any files were processed successfully
    if (processedDocuments.length === 0 && errors.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No files could be processed',
        data: { errors }
      })
    }

    // Trigger embedding generation for successfully uploaded documents
    const documentIds = processedDocuments.map(doc => doc.id)
    if (documentIds.length > 0) {
      // Note: This would typically be done via a background job or queue
      // For now, we'll just indicate that embedding processing should start
      console.log(`Documents uploaded successfully. Starting embedding generation for documents: ${documentIds.join(', ')}`)
    }

    return {
      success: true,
      topicId: topicId,
      topicTitle: topic.title,
      processedCount: processedDocuments.length,
      totalCount: fileArray.length,
      documents: processedDocuments,
      errors: errors.length > 0 ? errors : undefined,
      embeddingProcessing: {
        message: 'Documents uploaded successfully. Embedding processing should be started manually via /api/embeddings/auto-process endpoint.',
        documentsForEmbedding: documentIds
      }
    }

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
