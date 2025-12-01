/**
 * Chat API - GET endpoint for streaming chat responses
 * Handles EventSource streaming for real-time chat
 */
import { createServerSupabaseAdminClient } from '../../lib/supabase'
import { embeddingService } from '../../lib/ai/embedding-service'
import { llmService } from '../../lib/ai/llm-service'
import { contextAssemblyService } from '../../lib/context-assembly'
import { useServerConfig } from '../../lib/config'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: string
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const config = useServerConfig()
    const query = getQuery(event)

    // Validate query parameters
    if (!query['message'] || typeof query['message'] !== 'string' || query['message'].trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message is required'
      })
    }

    if (!query['topicId']) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    const message = query['message'] as string
    const topicId = query['topicId'] as string
    const contextWindow = parseInt(query['contextWindow'] as string) || 8
    const temperature = parseFloat(query['temperature'] as string) || 0.7
    const systemPrompt = query['systemPrompt'] as string || ''

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title')
      .eq('id', topicId)
      .single()

    if (topicError || !topic) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Topic not found'
      })
    }

    // Set up Server-Sent Events
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Access-Control-Allow-Headers', 'Cache-Control')

    // Generate embedding for the user message
    const messageEmbedding = await embeddingService.generateEmbedding(message)

    // Retrieve relevant context using RAG
    const assembledContext = await contextAssemblyService.assembleContext(message, topicId, {
      maxChunks: contextWindow,
      similarityThreshold: 0.3
    })

    // Assemble context information
    const contextText = assembledContext.chunks.map(chunk => chunk.text).join('\n\n')
    const contextChunks = assembledContext.chunks
    
    // Build conversation messages
    const messages: ChatMessage[] = []
    
    // Add system prompt if provided
    if (systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: systemPrompt.replace('{topic}', topic.title).replace('{context}', contextText)
      })
    } else {
      // Default system prompt
      messages.push({
        role: 'system',
        content: `You are a helpful AI assistant analyzing documents about "${topic.title}". Use the following context from the documents to answer questions accurately and helpfully:\n\n${contextText}\n\nGuidelines:\n- Base your answers primarily on the provided context\n- If the context doesn't contain relevant information, say so clearly\n- Be concise but thorough in your explanations\n- Ask clarifying questions when needed\n- Maintain a friendly and professional tone`
      })
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message
    })

    // Stream the response
    const stream = llmService.generateStreamingCompletion({
      messages,
      temperature,
      max_tokens: 1000
    })

    // Send context information first
    const contextInfo = {
      chunks: contextChunks.length,
      details: contextChunks.map(chunk => ({
        document_name: chunk.documentFilename,
        text: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''),
        similarity: chunk.similarity
      }))
    }

    // Send context info
    event.node.res.write(`data: ${JSON.stringify({ type: 'context', data: contextInfo })}\n\n`)

    // Stream the AI response
    let fullResponse = ''
    for await (const chunk of stream) {
      if (chunk.content) {
        const content = chunk.content
        fullResponse += content
        
        // Send chunk to client
        event.node.res.write(`data: ${JSON.stringify({ 
          type: 'content', 
          data: { content } 
        })}\n\n`)
      }
      
      if (chunk.finished) {
        break
      }
    }

    // Send completion signal
    event.node.res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      data: { 
        fullResponse,
        contextInfo 
      } 
    })}\n\n`)
    
    // Close the stream
    event.node.res.end()

  } catch (error) {
    console.error('Chat streaming error:', error)
    
    // Send error to client
    event.node.res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      data: { 
        message: error instanceof Error ? error.message : 'An error occurred during chat processing' 
      } 
    })}\n\n`)
    
    event.node.res.end()
  }
})
