/**
 * AI service monitoring and health check utilities
 * Provides comprehensive monitoring for Ollama and OpenRouter services
 */

import { logger } from '../../utils/logger'
import { embeddingService } from './embedding-service'
import { llmService } from './llm-service'

export interface ServiceHealth {
  service: string
  available: boolean
  responseTime: number
  lastCheck: string
  error?: string
  details?: any
}

export interface AISystemHealth {
  overall: {
    healthy: boolean
    score: number // 0-100
    lastCheck: string
  }
  services: {
    embedding: ServiceHealth
    llm: ServiceHealth
  }
  recommendations: string[]
}

export class AIMonitor {
  private healthCache: Map<string, ServiceHealth> = new Map()
  private cacheTimeout = 60000 // 1 minute cache

  /**
   * Comprehensive health check for all AI services
   */
  async checkSystemHealth(): Promise<AISystemHealth> {
    const startTime = Date.now()
    
    logger.debug('Starting comprehensive AI system health check')

    try {
      // Check embedding service
      const embeddingHealth = await this.checkEmbeddingService()
      
      // Check LLM service
      const llmHealth = await this.checkLLMService()

      // Calculate overall health score
      const overallScore = this.calculateHealthScore([embeddingHealth, llmHealth])
      const overallHealthy = overallScore >= 70 // 70% threshold

      // Generate recommendations
      const recommendations = this.generateRecommendations([embeddingHealth, llmHealth])

      const result: AISystemHealth = {
        overall: {
          healthy: overallHealthy,
          score: overallScore,
          lastCheck: new Date().toISOString()
        },
        services: {
          embedding: embeddingHealth,
          llm: llmHealth
        },
        recommendations
      }

      logger.info('AI system health check completed', {
        overallHealthy,
        score: overallScore,
        duration: Date.now() - startTime,
        recommendationCount: recommendations.length
      })

      return result

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown health check error'
      logger.error('AI system health check failed', { error: message })

      return {
        overall: {
          healthy: false,
          score: 0,
          lastCheck: new Date().toISOString()
        },
        services: {
          embedding: {
            service: 'Ollama Embeddings',
            available: false,
            responseTime: 0,
            lastCheck: new Date().toISOString(),
            error: message
          },
          llm: {
            service: 'OpenRouter LLM',
            available: false,
            responseTime: 0,
            lastCheck: new Date().toISOString(),
            error: message
          }
        },
        recommendations: ['System health check failed - check service configurations']
      }
    }
  }

  /**
   * Check embedding service health with caching
   */
  async checkEmbeddingService(): Promise<ServiceHealth> {
    const cacheKey = 'embedding'
    const cached = this.getCachedHealth(cacheKey)
    if (cached) return cached

    const startTime = Date.now()
    
    try {
      logger.debug('Checking embedding service health')

      const healthResult = await embeddingService.healthCheck()
      const responseTime = Date.now() - startTime

      const health: ServiceHealth = {
        service: 'Ollama Embeddings',
        available: healthResult.available && healthResult.modelLoaded,
        responseTime,
        lastCheck: new Date().toISOString(),
        ...(healthResult.error && { error: healthResult.error }),
        details: {
          ollamaRunning: healthResult.available,
          modelLoaded: healthResult.modelLoaded,
          model: 'EntropyYue/jina-embeddings-v2-base-zh'
        }
      }

      this.setCachedHealth(cacheKey, health)
      return health

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown embedding error'
      const health: ServiceHealth = {
        service: 'Ollama Embeddings',
        available: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: message
      }

      this.setCachedHealth(cacheKey, health)
      return health
    }
  }

  /**
   * Check LLM service health with caching
   */
  async checkLLMService(): Promise<ServiceHealth> {
    const cacheKey = 'llm'
    const cached = this.getCachedHealth(cacheKey)
    if (cached) return cached

    const startTime = Date.now()
    
    try {
      logger.debug('Checking LLM service health')

      const healthResult = await llmService.healthCheck()
      const responseTime = Date.now() - startTime

      const health: ServiceHealth = {
        service: 'OpenRouter LLM',
        available: healthResult.available,
        responseTime,
        lastCheck: new Date().toISOString(),
        ...(healthResult.error && { error: healthResult.error }),
        details: {
          modelsAvailable: healthResult.models?.length || 0,
          defaultModel: (() => {
            try {
              const config = useRuntimeConfig()
              return config?.ai?.llm?.defaultModel || 'google/gemini-2.0-flash-001'
            } catch {
              return 'google/gemini-2.0-flash-001'
            }
          })()
        }
      }

      this.setCachedHealth(cacheKey, health)
      return health

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LLM error'
      const health: ServiceHealth = {
        service: 'OpenRouter LLM',
        available: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: message
      }

      this.setCachedHealth(cacheKey, health)
      return health
    }
  }

  /**
   * Test AI services with sample bilingual content
   */
  async performIntegrationTest(): Promise<{
    success: boolean
    results: {
      embeddingTest: any
      llmTest: any
      integrationTest?: any
    }
    error?: string
  }> {
    try {
      logger.info('Starting AI services integration test')

      // Test embedding service with bilingual content
      const embeddingTest = await embeddingService.testBilingualEmbeddings()

      // Test LLM service with bilingual generation
      const llmTest = await llmService.testBilingualGeneration()

      // Integration test: Generate embedding and use for context
      let integrationTest = null
      if (embeddingTest.success && llmTest.success) {
        try {
          const testText = 'This is a test document about artificial intelligence and machine learning.'
          const embedding = await embeddingService.generateEmbedding(testText)
          
          const llmResponse = await llmService.generateChatResponse(
            [{ role: 'user', content: 'What is this document about?' }],
            testText,
            'You are a helpful assistant that answers questions based on the provided context.'
          )

          integrationTest = {
            success: true,
            embeddingDimensions: embedding.length,
            responseLength: llmResponse.content.length,
            contextUsed: testText.length
          }
        } catch (error) {
          integrationTest = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown integration error'
          }
        }
      }

      const overallSuccess = embeddingTest.success && llmTest.success && (integrationTest?.success ?? false)

      logger.info('AI services integration test completed', {
        overallSuccess,
        embeddingSuccess: embeddingTest.success,
        llmSuccess: llmTest.success,
        integrationSuccess: integrationTest?.success
      })

      return {
        success: overallSuccess,
        results: {
          embeddingTest,
          llmTest,
          integrationTest
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown integration test error'
      logger.error('AI services integration test failed', { error: message })

      return {
        success: false,
        results: {
          embeddingTest: { success: false, error: message },
          llmTest: { success: false, error: message }
        },
        error: message
      }
    }
  }

  /**
   * Calculate overall health score from individual service health
   */
  private calculateHealthScore(services: ServiceHealth[]): number {
    if (services.length === 0) return 0

    let totalScore = 0
    let weights = 0

    for (const service of services) {
      let serviceScore = 0
      let serviceWeight = 50 // Base weight per service

      // Availability (40 points)
      if (service.available) {
        serviceScore += 40
      }

      // Response time (30 points)
      if (service.responseTime < 1000) {
        serviceScore += 30
      } else if (service.responseTime < 3000) {
        serviceScore += 20
      } else if (service.responseTime < 5000) {
        serviceScore += 10
      }

      // Error status (30 points)
      if (!service.error) {
        serviceScore += 30
      }

      totalScore += (serviceScore / 100) * serviceWeight
      weights += serviceWeight
    }

    return Math.round((totalScore / weights) * 100)
  }

  /**
   * Generate recommendations based on service health
   */
  private generateRecommendations(services: ServiceHealth[]): string[] {
    const recommendations: string[] = []

    for (const service of services) {
      if (!service.available) {
        if (service.service.includes('Ollama')) {
          recommendations.push('Start Ollama service - run "ollama serve" in terminal')
          if (service.details && !service.details.modelLoaded) {
            recommendations.push('Install embedding model - run "ollama pull EntropyYue/jina-embeddings-v2-base-zh"')
          }
        } else if (service.service.includes('OpenRouter')) {
          recommendations.push('Check OpenRouter API key configuration in .env file')
          recommendations.push('Verify OpenRouter account has sufficient credits')
        }
      }

      if (service.responseTime > 5000) {
        recommendations.push(`${service.service} response time is slow (${service.responseTime}ms) - check network connectivity`)
      }

      if (service.error && service.error.includes('timeout')) {
        recommendations.push(`${service.service} is experiencing timeouts - consider increasing timeout values`)
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('All AI services are healthy and performing well')
    }

    return recommendations
  }

  /**
   * Get cached health result if still valid
   */
  private getCachedHealth(key: string): ServiceHealth | null {
    const cached = this.healthCache.get(key)
    if (!cached) return null

    const age = Date.now() - new Date(cached.lastCheck).getTime()
    if (age > this.cacheTimeout) {
      this.healthCache.delete(key)
      return null
    }

    return cached
  }

  /**
   * Cache health result
   */
  private setCachedHealth(key: string, health: ServiceHealth): void {
    this.healthCache.set(key, health)
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache.clear()
    logger.debug('AI monitor cache cleared')
  }
}

// Export singleton instance
export const aiMonitor = new AIMonitor()
