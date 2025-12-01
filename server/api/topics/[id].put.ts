/**
 * Topics API - PUT endpoint
 * Updates an existing topic
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { TopicUpdate } from '../../../types/database'

interface UpdateTopicRequest {
  title?: string
  description?: string
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const topicId = getRouterParam(event, 'id')
    const body = await readBody<UpdateTopicRequest>(event)

    if (!topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Validate that at least one field is provided for update
    if (!body.title && !body.description && body.description !== null) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one field (title or description) must be provided for update'
      })
    }

    // Prepare update data
    const updateData: TopicUpdate = {
      updated_at: new Date().toISOString()
    }

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Title must be a non-empty string'
        })
      }
      updateData.title = body.title.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    // Update the topic
    const { data: topic, error } = await supabase
      .from('topics')
      .update(updateData)
      .eq('id', topicId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Topic not found'
        })
      }
      
      console.error('Database error updating topic:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update topic',
        data: error
      })
    }

    return {
      success: true,
      topic,
      message: 'Topic updated successfully'
    }
  } catch (error) {
    console.error('Error updating topic:', error)
    
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
