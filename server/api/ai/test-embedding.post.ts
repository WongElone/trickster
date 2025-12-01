/**
 * Test endpoint for embedding service
 * Tests Ollama embedding generation with bilingual support
 */

import { embeddingService } from '../../../lib/ai/embedding-service'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { text, testType = 'single' } = body

    if (!text && testType === 'single') {
      return {
        success: false,
        error: 'Text is required for single embedding test'
      }
    }

    switch (testType) {
      case 'single':
        // Test single embedding generation
        const embedding = await embeddingService.generateEmbedding(text)
        
        return {
          success: true,
          data: {
            textLength: text.length,
            embeddingDimensions: embedding.length,
            embedding: embedding.slice(0, 5), // Show first 5 dimensions only
            model: 'EntropyYue/jina-embeddings-v2-base-zh'
          }
        }

      case 'bilingual':
        // Test bilingual embedding generation
        const bilingualResult = await embeddingService.testBilingualEmbeddings()
        
        return {
          success: bilingualResult.success,
          data: bilingualResult.results,
          error: bilingualResult.error
        }

      case 'health':
        // Test service health
        const healthResult = await embeddingService.healthCheck()
        
        return {
          success: healthResult.available && healthResult.modelLoaded,
          data: healthResult,
          error: healthResult.error
        }

      default:
        return {
          success: false,
          error: 'Invalid test type. Use: single, bilingual, or health'
        }
    }

  } catch (error) {
    console.error('Embedding test failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown embedding test error',
      data: {
        timestamp: new Date().toISOString()
      }
    }
  }
})
