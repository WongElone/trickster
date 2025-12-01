/**
 * Documents API - Bulk operations endpoint
 * Handles bulk deletion and other bulk operations on documents
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'

interface BulkOperationRequest {
  operation: 'delete'
  documentIds: string[]
  topicId?: string
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<BulkOperationRequest>(event)

    // Validate request
    if (!body.operation || !body.documentIds || !Array.isArray(body.documentIds) || body.documentIds.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Operation and documentIds array are required'
      })
    }

    if (body.documentIds.length > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Maximum 100 documents can be processed in a single bulk operation'
      })
    }

    switch (body.operation) {
      case 'delete':
        return await handleBulkDelete(supabase, body.documentIds, body.topicId)
      
      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Unsupported operation: ${body.operation}`
        })
    }

  } catch (error) {
    console.error('Error in bulk operation:', error)
    
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

async function handleBulkDelete(supabase: ReturnType<typeof createServerSupabaseAdminClient>, documentIds: string[], topicId?: string) {
  // Verify documents exist and optionally belong to the specified topic
  let query = supabase
    .from('documents')
    .select('id, original_filename, topic_id')
    .in('id', documentIds)

  if (topicId) {
    query = query.eq('topic_id', topicId)
  }

  const { data: existingDocuments, error: checkError } = await query

  if (checkError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to verify documents',
      data: checkError
    })
  }

  if (!existingDocuments || existingDocuments.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No documents found with the provided IDs'
    })
  }

  const foundIds = existingDocuments.map(doc => doc.id)
  const notFoundIds = documentIds.filter(id => !foundIds.includes(id))

  // Delete associated embeddings first
  const { error: embeddingsError } = await supabase
    .from('embeddings')
    .delete()
    .in('document_id', foundIds)

  if (embeddingsError) {
    console.error('Error deleting embeddings:', embeddingsError)
    // Continue with document deletion even if embeddings deletion fails
  }

  // Delete the documents
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .in('id', foundIds)

  if (deleteError) {
    console.error('Database error deleting documents:', deleteError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete documents',
      data: deleteError
    })
  }

  return {
    success: true,
    message: `Successfully deleted ${foundIds.length} document(s)`,
    deletedCount: foundIds.length,
    deletedDocuments: existingDocuments.map(doc => ({
      id: doc.id,
      filename: doc.original_filename
    })),
    notFound: notFoundIds.length > 0 ? notFoundIds : undefined
  }
}
