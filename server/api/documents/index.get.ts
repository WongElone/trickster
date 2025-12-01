/**
 * Documents API - GET endpoint
 * Retrieves documents for a specific topic with pagination
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { contentPaginationService } from '../../../lib/content-pagination'

const SORT_FIELD_MAP = {
  name: 'original_filename',
  upload_time: 'uploaded_at',
  size: 'size_bytes'
} as const

type SortFieldKey = keyof typeof SORT_FIELD_MAP

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const query = getQuery(event)

    const topicId = query['topicId'] as string
    const pageParam = parseInt(query['page'] as string) || 1
    const limitParam = parseInt(query['limit'] as string) || 20
    const sortFieldParam = (query['sortField'] as string) || 'upload_time'
    const sortDirectionParam = (query['sortDirection'] as string) === 'asc' ? 'asc' : 'desc'

    if (!topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title')
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

    // Get total count
    const { count, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topicId)

    if (countError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to count documents',
        data: countError
      })
    }

    // Get documents with pagination
    const totalCount = count || 0

    const paginationInfo = contentPaginationService.createPagination(totalCount, {
      page: pageParam,
      limit: limitParam,
      maxLimit: 100,
      defaultLimit: 20
    })

    const { page, limit, offset, totalPages, hasNext, hasPrev } = paginationInfo

    const requestedSortField = (sortFieldParam as SortFieldKey)
    const sortColumn = SORT_FIELD_MAP[requestedSortField] || SORT_FIELD_MAP.upload_time
    const ascending = sortDirectionParam === 'asc'

    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, topic_id, filename, original_filename, format, size_bytes, uploaded_at, processed_at, embedding_status')
      .eq('topic_id', topicId)
      .order(sortColumn, { ascending, nullsFirst: ascending })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch documents',
        data: error
      })
    }

    const statusCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }

    for (const status of Object.keys(statusCounts) as Array<keyof typeof statusCounts>) {
      const { count: statusCount, error: statusError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topicId)
        .eq('embedding_status', status)

      if (statusError) {
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to count ${status} documents`,
          data: statusError
        })
      }

      statusCounts[status] = statusCount || 0
    }

    // Calculate total size by fetching all documents and summing on the client side
    const { data: allDocs, error: sizeError } = await supabase
      .from('documents')
      .select('size_bytes')
      .eq('topic_id', topicId)

    if (sizeError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to calculate document sizes',
        data: sizeError
      })
    }

    const totalSize = (allDocs || []).reduce((sum, doc) => sum + (doc.size_bytes || 0), 0)

    return {
      documents: documents || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext,
        hasPrev,
        sortField: requestedSortField,
        sortDirection: sortDirectionParam
      },
      stats: {
        totalDocuments: totalCount,
        totalSize,
        statusCounts
      },
      topic: {
        id: topic.id,
        title: topic.title
      }
    }

  } catch (error) {
    console.error('Error fetching documents:', error)
    
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
