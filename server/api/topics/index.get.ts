/**
 * Topics API - GET endpoint
 * Retrieves all topics with optional statistics
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { Topic, TopicStats } from '../../../types/database'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const query = getQuery(event)
    const includeStats = query['stats'] === 'true'

    // Get all topics
    const { data: topics, error } = await supabase
      .from('topics')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch topics',
        data: error
      })
    }

    // If stats are requested, fetch statistics for each topic
    if (includeStats && topics) {
      const topicsWithStats = await Promise.all(
        topics.map(async (topic: Topic) => {
          const { data: stats } = await supabase
            .rpc('get_topic_stats', { topic_uuid: topic.id })
          
          return {
            ...topic,
            stats: stats as unknown as TopicStats
          }
        })
      )
      
      return { topics: topicsWithStats }
    }

    return { topics: topics || [] }
  } catch (error) {
    console.error('Error fetching topics:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
