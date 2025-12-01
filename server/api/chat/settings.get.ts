/**
 * Chat API - GET chat settings endpoint
 * Returns available chat configuration options and current defaults
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const query = getQuery(event)
    
    const topicId = query['topicId'] as string

    if (!topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title, description')
      .eq('id', topicId)
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

    // Get embedding count to determine max context window
    const { count: embeddingCount } = await supabase
      .from('embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('documents.topic_id', topicId)

    const availableEmbeddings = embeddingCount || 0

    return {
      success: true,
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description
      },
      chatSettings: {
        contextWindow: {
          default: 5,
          min: 1,
          max: Math.min(availableEmbeddings, 10),
          description: 'Number of relevant document chunks to include as context',
          available: availableEmbeddings
        },
        temperature: {
          default: 0.7,
          min: 0.0,
          max: 2.0,
          step: 0.1,
          description: 'Controls randomness in responses (0.0 = deterministic, 2.0 = very creative)'
        },
        maxTokens: {
          default: 1000,
          min: 100,
          max: 4000,
          step: 100,
          description: 'Maximum length of AI response'
        },
        streaming: {
          default: true,
          description: 'Enable real-time streaming of responses'
        }
      },
      systemPrompts: {
        default: `You are a helpful AI assistant for the Trickster imagination generator. You have access to documents and content related to the topic "${topic.title}".

Topic Description: ${topic.description || 'No description provided'}

Use the provided context to answer questions and engage in creative discussions. If the context doesn't contain relevant information, you can still provide helpful responses based on your general knowledge, but mention when you're going beyond the provided context.

Be creative, engaging, and encourage "what if" thinking and imagination.`,
        templates: [
          {
            name: 'Creative Assistant',
            prompt: 'You are a creative writing assistant focused on imagination and "what if" scenarios. Help users explore creative possibilities based on their documents.'
          },
          {
            name: 'Research Helper',
            prompt: 'You are a research assistant helping users understand and analyze their documents. Provide clear summaries and insights.'
          },
          {
            name: 'Discussion Partner',
            prompt: 'You are a thoughtful discussion partner. Ask probing questions and help users think deeper about their content.'
          }
        ]
      },
      storage: {
        location: 'browser_local_storage',
        key: `trickster_chat_${topicId}`,
        structure: {
          conversations: 'Array of conversation objects',
          settings: 'User preferences for this topic',
          lastAccessed: 'Timestamp of last chat activity'
        }
      }
    }

  } catch (error) {
    console.error('Error fetching chat settings:', error)
    
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
