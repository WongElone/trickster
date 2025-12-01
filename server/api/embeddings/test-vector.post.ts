/**
 * Test Embeddings API - Convert text to vector for debugging
 * This endpoint is purely for testing and debugging embedding generation
 */
import { embeddingService } from '../../../lib/ai/embedding-service'

interface TestVectorRequest {
  text: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<TestVectorRequest>(event)

    // Validate request
    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Text is required'
      })
    }

    console.log('Test vector generation for text:', body.text.substring(0, 100) + '...')

    // Generate embedding using the same service as the search endpoint
    const embedding = await embeddingService.generateEmbedding(body.text.trim())

    if (!embedding || embedding.length === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate embedding'
      })
    }

    console.log('Generated embedding dimensions:', embedding.length)
    console.log('First 5 values:', embedding.slice(0, 5))
    console.log('Last 5 values:', embedding.slice(-5))

    return {
      text: body.text,
      embedding: embedding,
      metadata: {
        dimensions: embedding.length,
        model: 'qwen3-embedding:8b',
        expectedDimensions: 2048,
        dimensionsMatch: embedding.length === 2048,
        textLength: body.text.length,
        firstFiveValues: embedding.slice(0, 5),
        lastFiveValues: embedding.slice(-5),
        vectorMagnitude: Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)),
        jsonLength: JSON.stringify(embedding).length
      }
    }

  } catch (error) {
    console.error('Error in test vector generation:', error)
    
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})
