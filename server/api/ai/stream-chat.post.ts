/**
 * Streaming chat endpoint for real-time LLM responses
 * Handles Server-Sent Events for live chat functionality
 */

import { llmService } from '../../../lib/ai/llm-service'
import { streamingHandler } from '../../../lib/ai/streaming-handler'
import { vectorSearchService } from '../../../lib/ai/vector-search'
import { embeddingService } from '../../../lib/ai/embedding-service'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      messages, 
      topicId, 
      systemPrompt, 
      language = 'en',
      contextWindow = 4000,
      temperature = 0.7,
      model 
    } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required')
    }

    // Get the latest user message for context retrieval
    const latestMessage = messages[messages.length - 1]
    if (latestMessage.role !== 'user') {
      throw new Error('Latest message must be from user')
    }

    // Get RAG context if topicId is provided
    let context = ''
    if (topicId) {
      try {
        const ragContext = await vectorSearchService.getRAGContext(
          latestMessage.content,
          embeddingService,
          {
            topicId,
            limit: 10,
            threshold: 0.6,
            maxContextLength: contextWindow
          }
        )
        context = ragContext.context
      } catch (error) {
        console.warn('Failed to retrieve RAG context:', error)
        // Continue without context
      }
    }

    // Generate streaming response
    const streamGenerator = llmService.generateStreamingCompletion({
      messages: [
        {
          role: 'system',
          content: systemPrompt || (language === 'zh' 
            ? '你是一个智能助手，基于提供的上下文回答用户问题。请用中文回答，保持准确、有帮助且友好的语调。'
            : 'You are an intelligent assistant that answers questions based on the provided context. Be accurate, helpful, and maintain a friendly tone.')
        },
        ...messages.map((msg, index) => {
          // Add context to the first user message
          if (index === 0 && msg.role === 'user' && context) {
            const contextPrefix = language === 'zh'
              ? `相关上下文信息：\n\n${context}\n\n---\n\n`
              : `Relevant context information:\n\n${context}\n\n---\n\n`
            
            return {
              ...msg,
              content: contextPrefix + msg.content
            }
          }
          return msg
        })
      ],
      model,
      temperature,
      stream: true
    })

    // Handle the streaming response
    await streamingHandler.handleLLMStream(streamGenerator, event)

  } catch (error) {
    console.error('Streaming chat failed:', error)
    
    // Send error through SSE
    const { writeError, close } = streamingHandler.createSSEStream(event)
    writeError(error instanceof Error ? error.message : 'Unknown streaming error')
    close()
  }
})
