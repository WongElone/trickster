/**
 * Streaming response handler for real-time chat
 * Manages Server-Sent Events (SSE) for streaming LLM responses
 */

import { logger } from '../../utils/logger'
import { AIServiceError } from '../../utils/errors'
import type { StreamingLLMResponse } from './llm-service'

export interface StreamingOptions {
  onChunk?: (chunk: string) => void
  onComplete?: (fullResponse: string) => void
  onError?: (error: Error) => void
  timeout?: number
}

export class StreamingHandler {
  private timeout: number

  constructor(timeout: number = 30000) {
    this.timeout = timeout
  }

  /**
   * Create Server-Sent Events stream for Nuxt API route
   */
  createSSEStream(event: any): {
    writeChunk: (data: any) => void
    writeError: (error: string) => void
    close: () => void
  } {
    // Set SSE headers
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Access-Control-Allow-Headers', 'Cache-Control')

    const writeChunk = (data: any) => {
      const chunk = `data: ${JSON.stringify(data)}\n\n`
      event.node.res.write(chunk)
    }

    const writeError = (error: string) => {
      const errorChunk = `data: ${JSON.stringify({ error, finished: true })}\n\n`
      event.node.res.write(errorChunk)
    }

    const close = () => {
      event.node.res.write('data: [DONE]\n\n')
      event.node.res.end()
    }

    return { writeChunk, writeError, close }
  }

  /**
   * Handle streaming LLM response and convert to SSE
   */
  async handleLLMStream(
    streamGenerator: AsyncGenerator<StreamingLLMResponse, void, unknown>,
    event: any
  ): Promise<void> {
    const { writeChunk, writeError, close } = this.createSSEStream(event)
    
    try {
      let fullContent = ''
      let chunkCount = 0
      const startTime = Date.now()

      logger.debug('Starting LLM stream handling')

      for await (const chunk of streamGenerator) {
        chunkCount++
        
        if (chunk.finished) {
          // Stream completed
          writeChunk({
            type: 'completion',
            finished: true,
            fullContent,
            usage: chunk.usage,
            metadata: {
              chunkCount,
              duration: Date.now() - startTime
            }
          })
          break
        } else {
          // Stream chunk
          fullContent += chunk.content
          
          writeChunk({
            type: 'chunk',
            content: chunk.content,
            finished: false,
            progress: {
              chunkIndex: chunkCount,
              totalLength: fullContent.length
            }
          })
        }

        // Check for timeout
        if (Date.now() - startTime > this.timeout) {
          throw new Error('Stream timeout exceeded')
        }
      }

      logger.info('LLM stream completed', {
        chunkCount,
        totalLength: fullContent.length,
        duration: Date.now() - startTime
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown streaming error'
      logger.error('LLM stream failed', { error: message })
      writeError(message)
    } finally {
      close()
    }
  }

  /**
   * Handle text chunking stream for document processing
   */
  async handleChunkingStream(
    text: string,
    chunkingService: any,
    event: any
  ): Promise<void> {
    const { writeChunk, writeError, close } = this.createSSEStream(event)
    
    try {
      logger.debug('Starting text chunking stream', { textLength: text.length })

      // Send initial status
      writeChunk({
        type: 'status',
        message: 'Starting text processing...',
        progress: 0
      })

      // Process text in chunks (simulate streaming for large texts)
      const chunks = chunkingService.chunkText(text)
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const progress = ((i + 1) / chunks.length) * 100

        writeChunk({
          type: 'chunk_processed',
          chunk: {
            index: chunk.index,
            text: chunk.text.substring(0, 200) + '...', // Preview only
            wordCount: chunk.wordCount,
            charCount: chunk.charCount
          },
          progress: Math.round(progress),
          finished: i === chunks.length - 1
        })

        // Small delay to simulate processing time
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Send completion status
      writeChunk({
        type: 'completion',
        finished: true,
        summary: chunkingService.getChunkingStats(chunks)
      })

      logger.info('Text chunking stream completed', {
        totalChunks: chunks.length,
        totalLength: text.length
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown chunking error'
      logger.error('Text chunking stream failed', { error: message })
      writeError(message)
    } finally {
      close()
    }
  }

  /**
   * Handle embedding generation stream
   */
  async handleEmbeddingStream(
    texts: string[],
    embeddingService: any,
    event: any
  ): Promise<void> {
    const { writeChunk, writeError, close } = this.createSSEStream(event)
    
    try {
      logger.debug('Starting embedding generation stream', { textCount: texts.length })

      writeChunk({
        type: 'status',
        message: `Generating embeddings for ${texts.length} text chunks...`,
        progress: 0
      })

      const embeddings: number[][] = []
      const errors: string[] = []

      for (let i = 0; i < texts.length; i++) {
        try {
          const text = texts[i]
          if (!text) continue
          
          const embedding = await embeddingService.generateEmbedding(text)
          embeddings.push(embedding)

          const progress = ((i + 1) / texts.length) * 100

          writeChunk({
            type: 'embedding_generated',
            index: i,
            dimensions: embedding.length,
            textPreview: text.substring(0, 100) + '...',
            progress: Math.round(progress),
            finished: i === texts.length - 1
          })

        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Text ${i}: ${message}`)
          embeddings.push([])

          writeChunk({
            type: 'embedding_error',
            index: i,
            error: message,
            progress: ((i + 1) / texts.length) * 100
          })
        }

        // Small delay between requests
        if (i < texts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Send completion summary
      const successCount = embeddings.filter(e => e.length > 0).length
      
      writeChunk({
        type: 'completion',
        finished: true,
        summary: {
          totalTexts: texts.length,
          successfulEmbeddings: successCount,
          failedEmbeddings: errors.length,
          errors: errors.slice(0, 5) // Show first 5 errors only
        }
      })

      logger.info('Embedding generation stream completed', {
        totalTexts: texts.length,
        successCount,
        errorCount: errors.length
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown embedding error'
      logger.error('Embedding generation stream failed', { error: message })
      writeError(message)
    } finally {
      close()
    }
  }
}

// Export singleton instance
export const streamingHandler = new StreamingHandler()
