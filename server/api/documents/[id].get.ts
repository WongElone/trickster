/**
 * Documents API - GET single document endpoint
 * Retrieves a specific document by ID
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { Document } from '../../../types/database'

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

    // Get the document with topic information
    const { data: document, error } = await supabase
      .from('documents')
      .select(`
        *,
        topics (
          id,
          title,
          description
        )
      `)
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Document not found'
        })
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch document',
        data: error
      })
    }

    return { document }

  } catch (error) {
    console.error('Error fetching document:', error)
    
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
