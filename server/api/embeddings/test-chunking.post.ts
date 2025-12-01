/**
 * Test endpoint for LangChain chunking functionality
 * Validates chunking behavior and provides statistics
 */
import { langChainTextChunker, LangChainTextChunker } from '../../../lib/ai/langchain-text-chunker'

interface TestChunkingRequest {
  text: string
  options?: {
    chunkSize?: number
    chunkOverlap?: number
    separators?: string[]
    keepSeparator?: boolean
    minChunkSize?: number
    maxChunkSize?: number
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<TestChunkingRequest>(event)

    // Validate request
    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Text is required'
      })
    }

    console.log('Testing chunking for text length:', body.text.length)
    console.log('Custom options:', body.options || 'none')

    // Create chunker with custom options if provided
    const chunker = body.options 
      ? new LangChainTextChunker(body.options) 
      : langChainTextChunker

    // Perform chunking
    const chunks = await chunker.chunkText(body.text, 'test-document')
    const stats = chunker.getChunkingStats(chunks)

    console.log('Chunking completed:', {
      totalChunks: chunks.length,
      averageSize: stats.averageChunkSize,
      languageDistribution: stats.languageDistribution
    })

    return {
      success: true,
      input: {
        textLength: body.text.length,
        options: body.options || 'default'
      },
      chunks: chunks.map(chunk => ({
        text: chunk.text,
        index: chunk.index,
        charCount: chunk.metadata.charCount,
        wordCount: chunk.metadata.wordCount,
        language: chunk.metadata.language,
        separatorUsed: chunk.metadata.separatorUsed,
        startPosition: chunk.metadata.startPosition,
        endPosition: chunk.metadata.endPosition
      })),
      statistics: stats,
      metadata: {
        chunkingEngine: 'LangChain RecursiveCharacterTextSplitter',
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Chunking test error:', error)
    
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Chunking test failed',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})
