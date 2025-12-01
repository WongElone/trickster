/**
 * What-If API - POST generate endpoint with streaming support
 * Generates creative "What if" scenarios with real-time streaming (no database record creation)
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { contextAssemblyService } from '../../../lib/context-assembly'
import { llmService } from '../../../lib/ai/llm-service'
import { useServerConfig } from '~~/lib/config'

interface WhatIfGenerateRequest {
  prompt: string
  topicId: string
  unfinished_content?: string // For continuing previous generation
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
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    const config = useServerConfig()
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<WhatIfGenerateRequest>(event)

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
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system' as const,
        content: systemPrompt + contextSection
      },
      {
        role: 'user' as const,
        content: `No need to repeat or summarize prompt in the answer. No need to summarize the answer at the end. Answer in the same language as the prompt, which is either English or Chinese. Now generate a creative "What if" scenario based on this user prompt: "${body.prompt.trim()}".`
      }
    ]

    // If unfinished_content is provided, chain it for continuation
    if (body.unfinished_content && body.unfinished_content.trim()) {
      messages.push(
        {
          role: 'assistant' as const,
          content: body.unfinished_content.trim()
        },
        {
          role: 'user' as const,
          content: 'Seamlessly continue your response.'
        }
      )
    }

    // Set up Server-Sent Events headers
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Access-Control-Allow-Headers', 'Cache-Control')

    // Send initial metadata
    const initialData = {
      type: 'metadata',
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description
      },
      context: {
        summary: assembledContext.contextSummary,
        chunksUsed: assembledContext.totalChunks,
        documentCoverage: assembledContext.documentCoverage,
        assemblyStrategy: contextOptions.strategy
      },
      prompt: body.prompt.trim(),
      startTime: new Date().toISOString()
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`)

          // Generate the What-If scenario with streaming
          const generationOptions = body.generationOptions || {}
          
          let fullContent = ''
          let finalModel = ''
          let finalUsage: any = undefined
          
          const streamingGenerator = llmService.generateStreamingCompletion({
            messages,
            temperature: generationOptions.temperature || 0.8, // Higher temperature for creativity
            max_tokens: generationOptions.maxTokens || 2000,
            ...(generationOptions.model && { model: generationOptions.model }),
            stream: true
          })

          for await (const chunk of streamingGenerator) {
            if (!chunk.finished) {
              // Send content chunks
              fullContent += chunk.content
              controller.enqueue(`data: ${JSON.stringify({
                type: 'content',
                chunk: chunk.content
              })}\n\n`)
            } else {
              // Final chunk with usage information
              finalUsage = chunk.usage
              const processingTime = Date.now() - startTime
              
              // Send completion metadata with full content and context information
              controller.enqueue(`data: ${JSON.stringify({
                type: 'complete',
                content: fullContent, // Include the full generated text
                generation: {
                  model: generationOptions.model || config.ai.llm.defaultModel,
                  usage: finalUsage,
                  processingTime,
                  wordCount: estimateWordCount(fullContent), // Word count of the generated content
                  characterCount: fullContent.length
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
                }
              })}\n\n`)
              
              // Close the stream
              controller.close()
              break
            }
          }

        } catch (error) {
          console.error('Error in What-If streaming generation:', error)
          
          controller.enqueue(`data: ${JSON.stringify({
            type: 'error',
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`)
          
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error) {
    console.error('Error in What-If generation setup:', error)
    
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
