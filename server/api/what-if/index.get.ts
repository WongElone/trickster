/**
 * What-If API - GET endpoint for listing scenarios
 * Retrieves What-If scenarios for a specific topic with pagination
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

interface WhatIfScenario {
  id: string
  topic_id: string
  title: string
  prompt: string | null
  content: string | null
  word_count: number | null
  created_at: string
}

interface WhatIfListResponse {
  success: boolean
  scenarios: WhatIfScenario[]
  hasMore: boolean
  total: number
}

export default defineEventHandler(async (event): Promise<WhatIfListResponse> => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const query = getQuery(event)

    // Validate required parameters
    if (!query['topicId'] || typeof query['topicId'] !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(query['limit'] as string) || 12, 50) // Max 50 items per page
    const offset = parseInt(query['offset'] as string) || 0

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id')
      .eq('id', query['topicId'])
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

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('what_ifs')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', query['topicId'])

    if (countError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to count scenarios',
        data: countError
      })
    }

    // Fetch scenarios with pagination
    const { data: scenarios, error: scenariosError } = await supabase
      .from('what_ifs')
      .select('id, topic_id, title, prompt, content, word_count, created_at')
      .eq('topic_id', query['topicId'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (scenariosError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch scenarios',
        data: scenariosError
      })
    }

    const hasMore = (offset + limit) < (totalCount || 0)

    return {
      success: true,
      scenarios: scenarios || [],
      hasMore,
      total: totalCount || 0
    }

  } catch (error) {
    console.error('Error fetching What-If scenarios:', error)
    
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
