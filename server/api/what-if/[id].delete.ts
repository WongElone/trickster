/**
 * What-If API - DELETE endpoint
 * Deletes a What-If scenario from database
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

    // Get What-If scenario details before deletion
    const { data: whatIf, error: fetchError } = await supabase
      .from('what_ifs')
      .select('id, topic_id, prompt, title, created_at')
      .eq('id', whatIfId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'What-If scenario not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch What-If scenario for deletion',
        data: fetchError
      })
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('what_ifs')
      .delete()
      .eq('id', whatIfId)

    if (deleteError) {
      console.error('Database error deleting What-If scenario:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete What-If scenario from database',
        data: deleteError
      })
    }

    return {
      success: true,
      message: 'What-If scenario deleted successfully',
      deletedScenario: {
        id: whatIf.id,
        prompt: whatIf.prompt,
        title: whatIf.title,
        topicId: whatIf.topic_id,
        createdAt: whatIf.created_at
      }
    }

  } catch (error) {
    console.error('Error deleting What-If scenario:', error)
    
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
