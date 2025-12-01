/**
 * Topics API - DELETE endpoint
 * Deletes a topic and all associated data
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const topicId = getRouterParam(event, 'id')

    if (!topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Check if topic exists first
    const { data: existingTopic, error: checkError } = await supabase
      .from('topics')
      .select('id, title')
      .eq('id', topicId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Topic not found'
        })
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify topic existence',
        data: checkError
      })
    }

    // Delete the topic (cascade will handle related records)
    // Note: Database foreign key constraints should handle cascading deletes
    // for documents, embeddings, and what_ifs
    const { error: deleteError } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId)

    if (deleteError) {
      console.error('Database error deleting topic:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete topic',
        data: deleteError
      })
    }

    return {
      success: true,
      message: `Topic "${existingTopic.title}" deleted successfully`,
      deletedTopicId: topicId
    }
  } catch (error) {
    console.error('Error deleting topic:', error)
    
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
