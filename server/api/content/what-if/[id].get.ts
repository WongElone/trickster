/**
 * Content API - GET What-If content with pagination
 * Retrieves What-If scenario content with support for large content pagination
 */
import { createServerSupabaseAdminClient } from '../../../../lib/supabase'
import { contentPaginationService } from '../../../../lib/content-pagination'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const whatIfId = getRouterParam(event, 'id')
    const query = getQuery(event)

    if (!whatIfId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'What-If ID is required'
      })
    }

    // Validate pagination parameters
    const { page, limit, errors } = contentPaginationService.validatePaginationParams({
      page: query['page'] as string,
      limit: query['limit'] as string,
      maxLimit: 50 // Max 50 chunks per page for content
    })

    if (errors.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid pagination parameters',
        data: { errors }
      })
    }

    // Get What-If scenario from database
    const { data: whatIf, error: whatIfError } = await supabase
      .from('what_ifs')
      .select(`
        *,
        topics (
          id,
          title,
          description
        )
      `)
      .eq('id', whatIfId)
      .single()

    if (whatIfError) {
      if (whatIfError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'What-If scenario not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch What-If scenario',
        data: whatIfError
      })
    }

    // Get content directly from database
    const fullContent = whatIf.content || ''
    
    if (!fullContent) {
      throw createError({
        statusCode: 404,
        statusMessage: 'What-If content not found'
      })
    }

    // Parse pagination options
    const chunkSize = parseInt(query['chunkSize'] as string) || 2000
    const preserveWords = query['preserveWords'] !== 'false'
    const overlapSize = parseInt(query['overlapSize'] as string) || 100

    // Paginate the content
    const paginatedContent = contentPaginationService.paginateTextContent(fullContent, {
      chunkSize,
      page,
      limit,
      preserveWords,
      overlapSize
    })

    return {
      success: true,
      whatIf: {
        id: whatIf.id,
        prompt: whatIf.prompt,
        title: whatIf.title,
        createdAt: whatIf.created_at,
        wordCount: whatIf.word_count
      },
      topic: whatIf.topics ? {
        id: whatIf.topics.id,
        title: whatIf.topics.title,
        description: whatIf.topics.description
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
        fullContentAvailable: true,
        totalCharacters: paginatedContent.totalCharacters,
        totalWords: paginatedContent.totalWords,
        estimatedReadingTime: Math.ceil(paginatedContent.totalWords / 200) // ~200 words per minute
      }
    }

  } catch (error) {
    console.error('Error retrieving What-If content:', error)
    
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
