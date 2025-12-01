/**
 * Topics API - GET single topic endpoint
 * Retrieves a specific topic by ID with optional statistics
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { Topic, TopicStats } from '../../../types/database'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const topicId = getRouterParam(event, 'id')
    const query = getQuery(event)
    const includeStats = query['stats'] === 'true'

    if (!topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Get the topic
    const { data: topic, error } = await supabase
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Topic not found'
        })
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch topic',
        data: error
      })
    }

    // If stats are requested, fetch statistics for the topic
    if (includeStats) {
      const { data: stats } = await supabase
        .rpc('get_topic_stats', { topic_uuid: topic.id })
      
      return {
        topic: {
          ...topic,
          stats: stats as unknown as TopicStats
        }
      }
    }

    return { topic }
  } catch (error) {
    console.error('Error fetching topic:', error)
    
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
