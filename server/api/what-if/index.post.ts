/**
 * What-If API - POST endpoint for creative scenario generation
 * Generates creative "What if" scenarios based on document context with file system persistence
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { contextAssemblyService } from '../../../lib/context-assembly'
import { llmService } from '../../../lib/ai/llm-service'
import { fileSystemManager, type WhatIfContent } from '../../../lib/file-system-manager'
import { randomUUID } from 'crypto'
import { useServerConfig } from '~~/lib/config'

interface WhatIfRequest {
  prompt: string
  topicId: string
  contextOptions?: {
    maxChunks?: number
    strategy?: 'similarity' | 'diversity' | 'balanced' | 'comprehensive'
    similarityThreshold?: number
  }
  generationOptions?: {
    temperature?: number
    maxTokens?: number
    model?: string
  }
  saveToFile?: boolean
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    const config = useServerConfig()
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<WhatIfRequest>(event)

    // Validate request
    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Prompt is required and must be a non-empty string'
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

    // Assemble context from documents
    const contextOptions = {
      maxChunks: body.contextOptions?.maxChunks || 8,
      strategy: body.contextOptions?.strategy || 'comprehensive',
      similarityThreshold: body.contextOptions?.similarityThreshold || 0.6,
      includeMetadata: true
    }

    const assembledContext = await contextAssemblyService.assembleContext(
      body.prompt.trim(),
      body.topicId,
      contextOptions
    )

    // Prepare creative system prompt for What-If scenarios
    const systemPrompt = config.whatIf.defaultSystemPrompt

    // Build context section
    let contextSection = ''
    if (assembledContext.chunks.length > 0) {
      contextSection = `\n\nUse ONLY the following excerpts. If details span multiple, synthesize them step-by-step. Relevant excerpts:\n${assembledContext.chunks.map((chunk, index) => 
        `[${index + 1}] From "${chunk.documentFilename}":\n${chunk.text}`
      ).join('\n\n')}\n\n`
    }

    // Prepare messages for LLM
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt + contextSection
      },
      {
        role: 'user' as const,
        content: `Generate a creative "What if" scenario based on this prompt: "${body.prompt.trim()}"`
      }
    ]

    // Generate the What-If scenario
    const generationOptions = body.generationOptions || {}
    const response = await llmService.generateCompletion({
      messages,
      temperature: generationOptions.temperature || 0.8, // Higher temperature for creativity
      max_tokens: generationOptions.maxTokens || 2000,
      ...(generationOptions.model && { model: generationOptions.model }),
      stream: false
    })

    const processingTime = Date.now() - startTime

    // Prepare What-If content object
    const whatIfContent: WhatIfContent = {
      id: randomUUID(),
      topicId: body.topicId,
      prompt: body.prompt.trim(),
      content: response.content,
      createdAt: new Date().toISOString(),
      metadata: {
        wordCount: estimateWordCount(response.content),
        characterCount: response.content.length,
        model: response.model,
        temperature: generationOptions.temperature || 0.8,
        contextChunks: assembledContext.totalChunks,
        processingTime
      }
    }

    // Save to file system if requested (default: true)
    let filename: string | undefined
    if (body.saveToFile !== false) {
      try {
        filename = await fileSystemManager.saveWhatIfContent(whatIfContent)
      } catch (saveError) {
        console.error('Failed to save What-If content to file system:', saveError)
        // Continue without failing the request
      }
    }

    // Store in database with new schema (Supabase storage)
    const { data: dbRecord, error: dbError } = await supabase
      .from('what_ifs')
      .insert({
        id: whatIfContent.id,
        topic_id: body.topicId,
        title: `What if: ${whatIfContent.prompt.substring(0, 50)}...`, // Generate title from prompt
        prompt: whatIfContent.prompt,
        content: whatIfContent.content, // Store content directly in database
        word_count: whatIfContent.metadata.wordCount
      })
      .select()
      .single()

    if (dbError) {
      console.error('Failed to store What-If reference in database:', dbError)
      // Continue without failing since content was generated successfully
    }

    return {
      success: true,
      whatIf: {
        id: whatIfContent.id,
        prompt: whatIfContent.prompt,
        content: whatIfContent.content,
        createdAt: whatIfContent.createdAt,
        metadata: whatIfContent.metadata
      },
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description
      },
      context: {
        summary: assembledContext.contextSummary,
        chunksUsed: assembledContext.totalChunks,
        documentCoverage: assembledContext.documentCoverage,
        assemblyStrategy: contextOptions.strategy,
        chunks: assembledContext.chunks.map(chunk => ({
          documentId: chunk.documentId,
          documentFilename: chunk.documentFilename,
          similarity: chunk.similarity,
          text: chunk.text.substring(0, 200) + '...', // Preview of chunk content
          chunkIndex: chunk.chunkIndex
        }))
      },
      storage: {
        savedToFile: !!filename,
        filename: filename || null,
        savedToDatabase: !!dbRecord
      },
      generation: {
        model: response.model,
        usage: response.usage,
        processingTime
      }
    }

  } catch (error) {
    console.error('Error in What-If generation:', error)
    
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

// Helper function to estimate word count with bilingual support
function estimateWordCount(text: string): number {
  const trimmedText = text.trim()
  if (trimmedText.length === 0) return 0
  
  // Take first 100 characters to determine text type
  const sample = trimmedText.substring(0, 100)
  const alphanumericCount = (sample.match(/[a-zA-Z0-9]/g) || []).length
  const alphanumericRatio = alphanumericCount / sample.length
  
  // If more than 50% alphanumeric, treat as English/Western text
  if (alphanumericRatio > 0.5) {
    return trimmedText.split(/\s+/).filter(word => word.length > 0).length
  } else {
    // Treat as Chinese/CJK text - count characters as words
    return trimmedText.length
  }
}
