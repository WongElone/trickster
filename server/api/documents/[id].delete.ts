/**
 * Documents API - DELETE endpoint
 * Deletes a document and its associated embeddings
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const documentId = getRouterParam(event, 'id')

    if (!documentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Document ID is required'
      })
    }

    // Check if document exists first
    const { data: existingDocument, error: checkError } = await supabase
      .from('documents')
      .select('id, original_filename, topic_id')
      .eq('id', documentId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Document not found'
        })
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify document existence',
        data: checkError
      })
    }

    // Delete associated embeddings first (if any exist)
    const { error: embeddingsError } = await supabase
      .from('embeddings')
      .delete()
      .eq('document_id', documentId)

    if (embeddingsError) {
      console.error('Error deleting embeddings:', embeddingsError)
      // Continue with document deletion even if embeddings deletion fails
    }

    // Delete the document
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Database error deleting document:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete document',
        data: deleteError
      })
    }

    return {
      success: true,
      message: `Document "${existingDocument.original_filename}" deleted successfully`,
      deletedDocumentId: documentId,
      topicId: existingDocument.topic_id
    }

  } catch (error) {
    console.error('Error deleting document:', error)
    
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
