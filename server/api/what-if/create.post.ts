/**
 * What-If API - POST create endpoint
 * Creates a new what-if scenario record in the database
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { WhatIfInsert } from '../../../types/database'

interface CreateWhatIfRequest {
  topicId: string
  title: string
  prompt?: string
}

interface CreateWhatIfResponse {
  success: boolean
  whatIf: {
    id: string
    topicId: string
    title: string
    prompt: string | null
    createdAt: string
  }
  topic: {
    id: string
    title: string
    description: string | null
  }
}

export default defineEventHandler(async (event): Promise<CreateWhatIfResponse> => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<CreateWhatIfRequest>(event)

    // Validate request
    if (!body.topicId || typeof body.topicId !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required and must be a string'
      })
    }

    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title is required and must be a non-empty string'
      })
    }

    if (body.prompt !== undefined && (typeof body.prompt !== 'string' || body.prompt.trim().length === 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Prompt must be a non-empty string if provided'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title, description')
      .eq('id', body.topicId)
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

    // Create new what-if scenario
    const whatIfData: WhatIfInsert = {
      topic_id: body.topicId,
      title: body.title.trim(),
      prompt: body.prompt ? body.prompt.trim() : null,
      content: null, // Content will be added later via update API
      word_count: 0
    }

    const { data: whatIf, error: insertError } = await supabase
      .from('what_ifs')
      .insert(whatIfData)
      .select('id, topic_id, title, prompt, created_at')
      .single()

    if (insertError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create what-if scenario',
        data: insertError
      })
    }

    return {
      success: true,
      whatIf: {
        id: whatIf.id,
        topicId: whatIf.topic_id,
        title: whatIf.title,
        prompt: whatIf.prompt,
        createdAt: whatIf.created_at
      },
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description
      }
    }

  } catch (error) {
    console.error('Error creating what-if scenario:', error)
    
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
