/**
 * Chat API - GET chat history endpoint
 * Retrieves chat conversation history for a topic (stored in browser local storage)
 * This endpoint provides metadata and suggestions for chat management
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

    // Verify topic exists and get basic info
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title, description, created_at')
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

    // Get topic statistics for context
    const { data: stats } = await supabase
      .rpc('get_topic_stats', { topic_uuid: topicId })

    // Get recent document uploads to suggest conversation starters
    const { data: recentDocuments } = await supabase
      .from('documents')
      .select('id, original_filename, uploaded_at, format')
      .eq('topic_id', topicId)
      .order('uploaded_at', { ascending: false })
      .limit(5)

    // Generate conversation starter suggestions based on available documents
    const conversationStarters = [
      `Tell me about the content in "${topic.title}"`,
      'What are the main themes in the uploaded documents?',
      'Can you summarize the key points from the documents?',
      'What interesting connections can you find in the content?'
    ]

    if (recentDocuments && recentDocuments.length > 0) {
      const latestDoc = recentDocuments[0]
      if (!latestDoc) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to retrieve recent documents'
        })
      }
      conversationStarters.unshift(
        `What can you tell me about "${latestDoc.original_filename}"?`
      )
    }

    return {
      success: true,
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        created_at: topic.created_at
      },
      chatMetadata: {
        storageKey: `trickster_chat_${topicId}`,
        storageLocation: 'browser_local_storage',
        note: 'Chat conversations are stored in browser local storage for privacy and quick access'
      },
      context: {
        documentCount: (stats as any)?.document_count || 0,
        totalSizeBytes: (stats as any)?.total_size_bytes || 0,
        embeddingCount: (stats as any)?.embedding_count || 0,
        lastDocumentUpload: (stats as any)?.last_document_upload || null,
        recentDocuments: recentDocuments || []
      },
      suggestions: {
        conversationStarters,
        chatSettings: {
          defaultContextWindow: 5,
          defaultTemperature: 0.7,
          defaultMaxTokens: 1000,
          streamingEnabled: true
        }
      }
    }

  } catch (error) {
    console.error('Error fetching chat history metadata:', error)
    
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
