/**
 * Embeddings API - GET endpoint
 * Retrieves embeddings for a document or topic with pagination
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { Embedding } from '../../../types/database'
import { useServerConfig } from '../../../lib/config'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const config = useServerConfig()
    const query = getQuery(event)
    
    const documentId = query['documentId'] as string
    const topicId = query['topicId'] as string
    const page = parseInt(query['page'] as string) || config.pagination.defaultPage
    const limit = Math.min(
      parseInt(query['limit'] as string) || config.pagination.defaultPageSize, 
      config.pagination.maxPageSize
    )
    const offset = (page - 1) * limit

    if (!documentId && !topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either documentId or topicId is required'
      })
    }

    let embeddingsQuery = supabase
      .from('embeddings')
      .select(`
        *,
        documents (
          id,
          original_filename,
          format,
          topic_id,
          topics (
            id,
            title
          )
        )
      `)

    // Filter by document or topic
    if (documentId) {
      embeddingsQuery = embeddingsQuery.eq('document_id', documentId)
    } else if (topicId) {
      // For topic filtering, we'll filter after getting document IDs
      // This will be handled below after we get the document IDs
    }

    // Get total count
    let countQuery
    let count = 0
    let countError = null

    if (documentId) {
      const countResult = await supabase
        .from('embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId)
      count = countResult.count || 0
      countError = countResult.error
    } else if (topicId) {
      // For topic filtering, first get document IDs for the topic
      const { data: topicDocuments, error: docError } = await supabase
        .from('documents')
        .select('id')
        .eq('topic_id', topicId)

      if (docError) {
        countError = docError
      } else if (topicDocuments && topicDocuments.length > 0) {
        const documentIds = topicDocuments.map(doc => doc.id)
        const countResult = await supabase
          .from('embeddings')
          .select('*', { count: 'exact', head: true })
          .in('document_id', documentIds)
        count = countResult.count || 0
        countError = countResult.error
      }
    }

    if (countError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to count embeddings',
        data: countError
      })
    }

    // Get embeddings with pagination
    if (topicId) {
      // For topic filtering, get document IDs first and then filter embeddings
      const { data: topicDocuments, error: docError } = await supabase
        .from('documents')
        .select('id')
        .eq('topic_id', topicId)

      if (docError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch topic documents',
          data: docError
        })
      }

      if (topicDocuments && topicDocuments.length > 0) {
        const documentIds = topicDocuments.map(doc => doc.id)
        embeddingsQuery = embeddingsQuery.in('document_id', documentIds)
      } else {
        // No documents for this topic, return empty result
        return {
          embeddings: [],
          pagination: {
            page,
            limit,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          filter: {
            documentId: documentId || undefined,
            topicId: topicId || undefined
          }
        }
      }
    }

    const { data: embeddings, error } = await embeddingsQuery
      .order('chunk_index', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch embeddings',
        data: error
      })
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return {
      embeddings: embeddings || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filter: {
        documentId: documentId || undefined,
        topicId: topicId || undefined
      }
    }

  } catch (error) {
    console.error('Error fetching embeddings:', error)
    
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
