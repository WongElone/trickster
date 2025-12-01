/**
 * Embeddings API - DELETE endpoint
 * Deletes a specific embedding by ID
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const embeddingId = getRouterParam(event, 'id')

    if (!embeddingId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Embedding ID is required'
      })
    }

    // Check if embedding exists first
    const { data: existingEmbedding, error: checkError } = await supabase
      .from('embeddings')
      .select('id, document_id, chunk_index')
      .eq('id', embeddingId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Embedding not found'
        })
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify embedding existence',
        data: checkError
      })
    }

    // Delete the embedding
    const { error: deleteError } = await supabase
      .from('embeddings')
      .delete()
      .eq('id', embeddingId)

    if (deleteError) {
      console.error('Database error deleting embedding:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete embedding',
        data: deleteError
      })
    }

    return {
      success: true,
      message: `Embedding deleted successfully`,
      deletedEmbeddingId: embeddingId,
      documentId: existingEmbedding.document_id,
      chunkIndex: existingEmbedding.chunk_index
    }

  } catch (error) {
    console.error('Error deleting embedding:', error)
    
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
