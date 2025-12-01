/**
 * Chat API - Clear chat history endpoint
 * Provides instructions for clearing chat history stored in browser local storage
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

interface ClearChatRequest {
  topicId: string
  confirmClear?: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<ClearChatRequest>(event)

    if (!body.topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title')
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

    // Since chat history is stored in browser local storage, 
    // we can only provide instructions for clearing it
    const storageKey = `trickster_chat_${body.topicId}`

    if (!body.confirmClear) {
      return {
        success: false,
        message: 'Chat history clearing requires confirmation',
        topic: {
          id: topic.id,
          title: topic.title
        },
        instructions: {
          storageKey,
          clearingInstructions: [
            'Chat conversations are stored in your browser\'s local storage for privacy',
            'To clear chat history, the client application should remove the localStorage item',
            `Use: localStorage.removeItem('${storageKey}')`,
            'Or clear all Trickster chat data with: Object.keys(localStorage).filter(key => key.startsWith(\'trickster_chat_\')).forEach(key => localStorage.removeItem(key))'
          ]
        },
        requireConfirmation: true
      }
    }

    // Confirmed clear - provide success response
    // The actual clearing happens on the client side
    return {
      success: true,
      message: `Chat history clearing confirmed for topic "${topic.title}"`,
      topic: {
        id: topic.id,
        title: topic.title
      },
      cleared: {
        storageKey,
        timestamp: new Date().toISOString(),
        note: 'Client should now remove the localStorage item to complete the clearing process'
      },
      instructions: {
        clientAction: `localStorage.removeItem('${storageKey}')`,
        verification: `Check that localStorage.getItem('${storageKey}') returns null`
      }
    }

  } catch (error) {
    console.error('Error in clear chat endpoint:', error)
    
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
