/**
 * What-If API - GET single scenario endpoint
 * Retrieves a specific What-If scenario by ID
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const whatIfId = getRouterParam(event, 'id')

    if (!whatIfId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'What-If ID is required'
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
    const fullContent = whatIf.content

    return {
      success: true,
      whatIf: {
        id: whatIf.id,
        prompt: whatIf.prompt,
        title: whatIf.title,
        content: fullContent,
        createdAt: whatIf.created_at,
        wordCount: whatIf.word_count
      },
      topic: whatIf.topics ? {
        id: whatIf.topics.id,
        title: whatIf.topics.title,
        description: whatIf.topics.description
      } : null
    }

  } catch (error) {
    console.error('Error fetching What-If scenario:', error)
    
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
