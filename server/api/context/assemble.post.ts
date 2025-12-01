/**
 * Context Assembly API - POST endpoint
 * Assembles intelligent context from vector search results for RAG applications
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { contextAssemblyService, type ContextAssemblyOptions } from '../../../lib/context-assembly'
import { useServerConfig } from '../../../lib/config'

interface ContextAssemblyRequest {
  query: string
  topicId: string
  options?: ContextAssemblyOptions
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const config = useServerConfig()
    const body = await readBody<ContextAssemblyRequest>(event)

    // Validate request
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Query is required and must be a non-empty string'
      })
    }

    if (!body.topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title, description')
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

    // Validate options if provided
    const options = body.options || {}
    if (options.maxChunks && (options.maxChunks < 1 || options.maxChunks > 20)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'maxChunks must be between 1 and 20'
      })
    }

    if (options.similarityThreshold && (options.similarityThreshold < 0 || options.similarityThreshold > 1)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'similarityThreshold must be between 0 and 1'
      })
    }

    if (options.diversityWeight && (options.diversityWeight < 0 || options.diversityWeight > 1)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'diversityWeight must be between 0 and 1'
      })
    }

    if (options.coherenceWeight && (options.coherenceWeight < 0 || options.coherenceWeight > 1)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'coherenceWeight must be between 0 and 1'
      })
    }

    // Assemble context using the context assembly service
    const assembledContext = await contextAssemblyService.assembleContext(
      body.query.trim(),
      body.topicId,
      options
    )

    return {
      success: true,
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description
      },
      context: assembledContext,
      usage: {
        query: body.query.trim(),
        strategy: options.strategy || config.contextAssembly.defaultStrategy,
        processingTime: assembledContext.assemblyMetadata.processingTime
      }
    }

  } catch (error) {
    console.error('Error in context assembly:', error)
    
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
