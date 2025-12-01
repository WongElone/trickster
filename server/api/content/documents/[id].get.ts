/**
 * Content API - GET document content with pagination
 * Retrieves document content with support for large content pagination
 */
import { createServerSupabaseAdminClient } from '../../../../lib/supabase'
import { contentPaginationService } from '../../../../lib/content-pagination'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const documentId = getRouterParam(event, 'id')
    const query = getQuery(event)

    if (!documentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Document ID is required'
      })
    }

    // Validate pagination parameters
    const { page, limit, errors } = contentPaginationService.validatePaginationParams({
      page: query['page'] as string,
      limit: query['limit'] as string,
      maxLimit: 50 // Max 50 chunks per page
    })

    if (errors.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid pagination parameters',
        data: { errors }
      })
    }

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        *,
        topics (
          id,
          title,
          description
        )
      `)
      .eq('id', documentId)
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

    // Parse pagination options
    const chunkSize = parseInt(query['chunkSize'] as string) || 2000
    const preserveWords = query['preserveWords'] !== 'false'
    const overlapSize = parseInt(query['overlapSize'] as string) || 100

    // Paginate the document content
    const paginatedContent = contentPaginationService.paginateTextContent(document.content, {
      chunkSize,
      page,
      limit,
      preserveWords,
      overlapSize
    })

    return {
      success: true,
      document: {
        id: document.id,
        originalFilename: document.original_filename,
        format: document.format,
        sizeBytes: document.size_bytes,
        uploadedAt: document.uploaded_at,
        processedAt: document.processed_at
      },
      topic: document.topics ? {
        id: document.topics.id,
        title: document.topics.title,
        description: document.topics.description
      } : null,
      content: paginatedContent,
      contentOptions: {
        chunkSize,
        preserveWords,
        overlapSize,
        requestedPage: page,
        requestedLimit: limit
      },
      navigation: {
        totalCharacters: paginatedContent.totalCharacters,
        totalWords: paginatedContent.totalWords,
        estimatedReadingTime: Math.ceil(paginatedContent.totalWords / 200), // ~200 words per minute
        originalSize: document.size_bytes
      }
    }

  } catch (error) {
    console.error('Error retrieving document content:', error)
    
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
