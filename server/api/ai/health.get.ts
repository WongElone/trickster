/**
 * AI services health check endpoint
 * Checks status of both Ollama and OpenRouter services
 */

import { embeddingService } from '../../../lib/ai/embedding-service'
import { llmService } from '../../../lib/ai/llm-service'

export default defineEventHandler(async (event) => {
  try {
    const startTime = Date.now()

    // Test Ollama embedding service
    const embeddingHealth = await embeddingService.healthCheck()
    
    // Test OpenRouter LLM service
    const llmHealth = await llmService.healthCheck()

    const endTime = Date.now()
    const responseTime = endTime - startTime

    const overallHealth = embeddingHealth.available && embeddingHealth.modelLoaded && llmHealth.available

    return {
      success: overallHealth,
      message: overallHealth ? 'All AI services are healthy' : 'Some AI services have issues',
      data: {
        overall: {
          healthy: overallHealth,
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString()
        },
        embedding: {
          service: 'Ollama',
          model: 'EntropyYue/jina-embeddings-v2-base-zh',
          available: embeddingHealth.available,
          modelLoaded: embeddingHealth.modelLoaded,
          error: embeddingHealth.error
        },
        llm: {
          service: 'OpenRouter',
          available: llmHealth.available,
          models: llmHealth.models,
          error: llmHealth.error
        },
        recommendations: overallHealth ? [] : [
          !embeddingHealth.available && 'Start Ollama service',
          !embeddingHealth.modelLoaded && 'Install jina-embeddings-v2-base-zh model',
          !llmHealth.available && 'Check OpenRouter API key configuration'
        ].filter(Boolean)
      }
    }

  } catch (error) {
    console.error('AI health check failed:', error)
    
    return {
      success: false,
      message: 'AI health check failed',
      error: error instanceof Error ? error.message : 'Unknown health check error',
      data: {
        overall: {
          healthy: false,
          timestamp: new Date().toISOString()
        }
      }
    }
  }
})
