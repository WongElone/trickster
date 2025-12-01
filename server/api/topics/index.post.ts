/**
 * Topics API - POST endpoint
 * Creates a new topic with metadata and timestamps
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { TopicInsert } from '../../../types/database'

interface CreateTopicRequest {
  title: string
  description?: string
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<CreateTopicRequest>(event)

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title is required and must be a non-empty string'
      })
    }

    if (body.title.length > 200) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title must be 200 characters or less'
      })
    }

    if (body.description && body.description.length > 1000) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Description must be 1000 characters or less'
      })
    }

    // Prepare topic data
    const topicData: TopicInsert = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert the new topic
    const { data: topic, error } = await supabase
      .from('topics')
      .insert(topicData)
      .select()
      .single()

    if (error) {
      console.error('Database error creating topic:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create topic',
        data: error
      })
    }

    return {
      success: true,
      topic,
      message: 'Topic created successfully'
    }
  } catch (error) {
    console.error('Error creating topic:', error)
    
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
