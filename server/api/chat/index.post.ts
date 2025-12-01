/**
 * Chat API - POST endpoint for RAG-based streaming chat
 * Handles conversational interactions with document context
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import { embeddingService } from '../../../lib/ai/embedding-service'
import { llmService } from '../../../lib/ai/llm-service'
import { StreamingHandler } from '../../../lib/ai/streaming-handler'
import { contextAssemblyService } from '../../../lib/context-assembly'
import { useServerConfig } from '../../../lib/config'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: string
}

interface ChatRequest {
  message: string
  topicId: string
  conversationHistory?: ChatMessage[]
  contextWindow?: number
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const config = useServerConfig()
    const body = await readBody<ChatRequest>(event)

    // Validate request
    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message is required'
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

    // Assemble intelligent context using the context assembly service
    const contextLimit = Math.min(
      body.contextWindow || config.chat.defaultContextWindow, 
      config.chat.maxContextWindow
    )
    const assembledContext = await contextAssemblyService.assembleContext(
      body.message.trim(),
      body.topicId,
      {
        maxChunks: contextLimit,
        strategy: config.contextAssembly.defaultStrategy as 'similarity' | 'diversity' | 'balanced' | 'comprehensive',
        similarityThreshold: config.contextAssembly.defaultSimilarityThreshold,
        includeMetadata: config.contextAssembly.defaultIncludeMetadata
      }
    )

    const relevantContext = assembledContext.chunks.map(chunk => chunk.text)

    // Prepare system prompt
    // default chat system prompt
    const defaultSystemPrompt = `
${config.chat.defaultSystemPrompt}.

You have access to documents and content related to the topic "${topic.title}".

Topic Description: ${topic.description || 'No description provided'}

PRIORITIZE using the following excerpts. If details span multiple, synthesize them step-by-step. Use the provided context to answer questions and engage in creative discussions. If the context doesn't contain relevant information, you should first mention it is not related to the documents uploaded in the answer.
`

    const systemPrompt = body.systemPrompt || defaultSystemPrompt

    // Build context section for the prompt
    let contextSection = ''
    if (relevantContext.length > 0) {
      contextSection = `\n\nRelevant excerpts:\n${relevantContext.map((context, index) => `[${index + 1}] ${context}`).join('\n\n')}\n\n`
    }

    // Prepare messages for LLM
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt + contextSection
      }
    ]

    // Add conversation history if provided
    if (body.conversationHistory && body.conversationHistory.length > 0) {
      // Limit conversation history to prevent token overflow
      const recentHistory = body.conversationHistory.slice(-config.chat.maxHistoryMessages)
      messages.push(...recentHistory)
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: body.message.trim(),
      timestamp: new Date().toISOString()
    })

    // Handle streaming vs non-streaming response
    if (body.stream !== false) {
      // Streaming response
      const streamingHandler = new StreamingHandler()
      const sseStream = streamingHandler.createSSEStream(event)

      try {
        let fullResponse = ''
        
        const streamResponse = llmService.generateStreamingCompletion({
          messages,
          temperature: body.temperature || config.ai.llm.defaultTemperature,
          max_tokens: body.maxTokens || config.ai.llm.defaultMaxTokens,
          stream: true
        })

        // Send initial metadata
        sseStream.writeChunk({
          type: 'metadata',
          topicId: body.topicId,
          topicTitle: topic.title,
          contextChunks: assembledContext.totalChunks,
          contextSummary: assembledContext.contextSummary,
          documentCoverage: assembledContext.documentCoverage,
          timestamp: new Date().toISOString()
        })

        // Process streaming chunks
        for await (const chunk of streamResponse) {
          if (chunk.content) {
            fullResponse += chunk.content
            sseStream.writeChunk({
              type: 'content',
              content: chunk.content,
              finished: chunk.finished
            })
          }

          if (chunk.finished) {
            sseStream.writeChunk({
              type: 'complete',
              fullResponse,
              usage: chunk.usage,
              finished: true
            })
            break
          }
        }

        sseStream.close()
        return // SSE streams don't return JSON

      } catch (streamError) {
        console.error('Streaming error:', streamError)
        const errorMessage = streamError instanceof Error ? streamError.message : 'Streaming failed'
        sseStream.writeError(errorMessage)
        sseStream.close()
        return
      }

    } else {
      // Non-streaming response
      const response = await llmService.generateCompletion({
        messages,
        temperature: body.temperature || config.ai.llm.defaultTemperature,
        max_tokens: body.maxTokens || config.ai.llm.defaultMaxTokens,
        stream: false
      })

      return {
        success: true,
        response: {
          content: response.content,
          role: 'assistant',
          timestamp: new Date().toISOString()
        },
        context: {
          topicId: body.topicId,
          topicTitle: topic.title,
          contextChunks: assembledContext.totalChunks,
          contextSummary: assembledContext.contextSummary,
          documentCoverage: assembledContext.documentCoverage,
          assemblyMetadata: assembledContext.assemblyMetadata,
          relevantContext: assembledContext.chunks.length > 0 ? assembledContext.chunks : undefined
        },
        usage: response.usage,
        model: response.model
      }
    }

  } catch (error) {
    console.error('Error in chat endpoint:', error)
    
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
