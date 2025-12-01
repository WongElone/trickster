/**
 * What-If API - GET list endpoint
 * Lists all What-If scenarios for a topic with pagination (content excluded for performance)
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

interface WhatIfListItem {
  id: string
  topicId: string
  prompt: string | null
  title: string
  wordCount: number | null
  createdAt: string
  hasContent: boolean
}

interface WhatIfListResponse {
  success: boolean
  topic: {
    id: string
    title: string
    description: string | null
  }
  whatIfs: WhatIfListItem[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default defineEventHandler(async (event): Promise<WhatIfListResponse> => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const query = getQuery(event)
    
    const topicId = query['topicId'] as string
    const page = parseInt(query['page'] as string) || 1
    const limit = Math.min(parseInt(query['limit'] as string) || 20, 50) // Max 50 per page
    const offset = (page - 1) * limit

    if (!topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title, description')
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

    // Get What-If scenarios from database with pagination (exclude content for performance)
    const { data: whatIfs, error: whatIfError, count } = await supabase
      .from('what_ifs')
      .select('id, topic_id, prompt, title, word_count, created_at, content', { count: 'exact' })
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (whatIfError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch What-If scenarios',
        data: whatIfError
      })
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Transform data and exclude content field
    const transformedWhatIfs: WhatIfListItem[] = (whatIfs || []).map(whatIf => ({
      id: whatIf.id,
      topicId: whatIf.topic_id,
      prompt: whatIf.prompt,
      title: whatIf.title,
      wordCount: whatIf.word_count,
      createdAt: whatIf.created_at,
      hasContent: !!whatIf.content && whatIf.content.length > 0
    }))

    return {
      success: true,
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description
      },
      whatIfs: transformedWhatIfs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }

  } catch (error) {
    console.error('Error listing What-If scenarios:', error)
    
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
