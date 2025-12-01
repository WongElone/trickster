/**
 * Embeddings API - Vector similarity search endpoint
 * Performs semantic search using vector embeddings
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { embeddingService } from '../../../lib/ai/embedding-service'
import { useServerConfig } from '../../../lib/config'

interface VectorSearchRequest {
  query: string
  topicId?: string
  documentIds?: string[]
  limit?: number
  threshold?: number
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const config = useServerConfig()
    const body = await readBody<VectorSearchRequest>(event)

    // Validate request
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Query text is required'
      })
    }

    const limit = Math.min(body.limit || config.ai.vectorSearch.defaultLimit, config.ai.vectorSearch.maxLimit)
    const threshold = Math.max(
      body.threshold || config.ai.vectorSearch.defaultThreshold, 
      config.ai.vectorSearch.minThreshold
    )

    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(body.query.trim())

    if (!queryEmbedding || queryEmbedding.length === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate query embedding'
      })
    }

    // Use Supabase's vector similarity search function
    const queryEmbeddingJson = JSON.stringify(queryEmbedding)
    let searchQuery
    
    if (body.topicId) {
      // Use topic-scoped search
      searchQuery = supabase.rpc('match_embeddings_by_topic', {
        query_embedding: queryEmbeddingJson,
        topic_uuid: body.topicId,
        match_threshold: threshold,
        match_count: limit
      })
    } else {
      // Use global search for backward compatibility
      searchQuery = supabase.rpc('match_embeddings', {
        query_embedding: queryEmbeddingJson,
        match_threshold: threshold,
        match_count: limit
      })
    }

    // Execute the search
    const { data: searchResults, error: searchError } = await searchQuery

    if (searchError) {
      console.error('Vector search error:', searchError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Vector search failed',
        data: searchError
      })
    }

    // If we have results, enrich them with document and topic information
    let enrichedResults: any[] = []
    if (searchResults && searchResults.length > 0) {
      const documentIds = [...new Set(searchResults.map((r: any) => r.document_id))]
      
      // Get document and topic information
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select(`
          id,
          original_filename,
          format,
          topic_id,
          topics (
            id,
            title,
            description
          )
        `)
        .in('id', documentIds)

      if (docError) {
        console.error('Error fetching document info:', docError)
      }

      // Create a map for quick lookup
      const documentMap = new Map()
      if (documents) {
        documents.forEach(doc => documentMap.set(doc.id, doc))
      }

      // Enrich search results
      enrichedResults = searchResults
        .filter((result: any) => {
          // Apply additional filters if specified
          if (body.topicId || body.documentIds) {
            const doc = documentMap.get(result.document_id)
            if (!doc) return false
            
            if (body.topicId && doc.topic_id !== body.topicId) return false
            if (body.documentIds && !body.documentIds.includes(result.document_id)) return false
          }
          return true
        })
        .map((result: any) => {
          const doc = documentMap.get(result.document_id)
          return {
            id: result.id,
            document_id: result.document_id,
            chunk_text: result.chunk_text,
            chunk_index: result.chunk_index,
            similarity: result.similarity,
            document: doc ? {
              id: doc.id,
              filename: doc.original_filename,
              format: doc.format,
              topic: doc.topics ? {
                id: doc.topics.id,
                title: doc.topics.title,
                description: doc.topics.description
              } : null
            } : null
          }
        })
        .slice(0, limit) // Ensure we don't exceed the requested limit after filtering
    }

    return {
      query: body.query,
      results: enrichedResults,
      metadata: {
        totalResults: enrichedResults.length,
        threshold,
        limit,
        queryEmbeddingDimensions: queryEmbedding.length,
        filters: {
          topicId: body.topicId || null,
          documentIds: body.documentIds || null
        }
      }
    }

  } catch (error) {
    console.error('Error in vector search:', error)
    
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
