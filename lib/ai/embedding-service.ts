/**
 * Embedding service for Trickster application
 * Handles text embedding generation using Ollama with jina-embeddings-v2-base-zh
 */

import { logger } from '../../utils/logger'
import { AIServiceError } from '../../utils/errors'
import { useServerConfig } from '../config'

export interface EmbeddingResponse {
  embedding: number[]
  model: string
  prompt_eval_count?: number
  eval_count?: number
  eval_duration?: number
}

export interface EmbeddingRequest {
  model: string
  prompt: string
  options?: {
    temperature?: number
    top_k?: number
    top_p?: number
  }
}

export class EmbeddingService {
  private baseUrl: string
  private model: string
  private timeout: number

  constructor(baseUrl?: string) {
    const config = useServerConfig()
    this.baseUrl = baseUrl || config.services.ollamaApiUrl
    this.model = config.ai.embedding.model
    this.timeout = config.ai.embedding.timeout
  }

  /**
   * Trim vector to desired dimensions (for qwen3-embedding:8b which outputs 4096D)
   */
  private trimVector(vector: number[], targetDimensions: number): number[] {
    if (vector.length <= targetDimensions) {
      return vector
    }
    return vector.slice(0, targetDimensions)
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      logger.debug('Generating embedding', { textLength: text.length, model: this.model })

      const request: EmbeddingRequest = {
        model: this.model,
        prompt: text.trim()
      }

      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
      }

      const data: EmbeddingResponse = await response.json()
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response format')
      }

      // Trim vector to target dimensions for qwen3-embedding:8b
      const config = useServerConfig()
      const trimmedEmbedding = this.trimVector(data.embedding, config.ai.embedding.dimensions)

      // Validate embedding dimensions after trimming
      if (trimmedEmbedding.length !== config.ai.embedding.dimensions) {
        logger.warn('Unexpected embedding dimensions after trimming', {
          expected: config.ai.embedding.dimensions,
          actual: trimmedEmbedding.length,
          original: data.embedding.length
        })
      }

      logger.debug('Embedding generated successfully', {
        originalDimensions: data.embedding.length,
        trimmedDimensions: trimmedEmbedding.length,
        model: data.model
      })

      return trimmedEmbedding

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown embedding error'
      logger.error('Embedding generation failed', { error: message, text: text.substring(0, 100) })
      throw new AIServiceError(`Failed to generate embedding: ${message}`, 'ollama', error as Error)
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    logger.info('Generating batch embeddings', { count: texts.length })

    const embeddings: number[][] = []
    const errors: string[] = []

    for (let i = 0; i < texts.length; i++) {
      try {
        const text = texts[i]
        if (!text) continue
        const embedding = await this.generateEmbedding(text)
        embeddings.push(embedding)
        
        // Add small delay between requests to avoid overwhelming Ollama
        if (i < texts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Text ${i}: ${message}`)
        embeddings.push([]) // Placeholder for failed embedding
      }
    }

    if (errors.length > 0) {
      logger.warn('Some embeddings failed', { errors, successCount: embeddings.filter(e => e.length > 0).length })
    }

    return embeddings
  }

  /**
   * Test if Ollama service is available and model is loaded
   */
  async healthCheck(): Promise<{ available: boolean; modelLoaded: boolean; error?: string }> {
    try {
      // Check if Ollama is running
      const healthResponse = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!healthResponse.ok) {
        return {
          available: false,
          modelLoaded: false,
          error: `Ollama not responding: ${healthResponse.status}`
        }
      }

      // Check if model is available
      const modelsResponse = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        // Check for qwen3-embedding:8b model (or fallback to base name)
        const modelBaseName = this.model.split(':')[0]
        const modelLoaded = modelsData.models?.some((m: any) => 
          m.name === this.model || m.name.includes(modelBaseName)
        )

        return {
          available: true,
          modelLoaded,
          ...(modelLoaded ? {} : { error: `Model ${this.model} not found. Available models: ${modelsData.models?.map((m: any) => m.name).join(', ')}` })
        }
      }

      return {
        available: true,
        modelLoaded: false,
        error: 'Could not check model availability'
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        available: false,
        modelLoaded: false,
        error: `Health check failed: ${message}`
      }
    }
  }

  /**
   * Test embedding generation with sample bilingual text
   */
  async testBilingualEmbeddings(): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      const testTexts = [
        'Hello, this is a test in English.',
        '你好，这是中文测试。',
        'Mixed language test: 这是一个混合语言的测试 with English and Chinese.'
      ]

      logger.info('Testing bilingual embeddings', { testTexts })

      const embeddings = await this.generateEmbeddings(testTexts)
      const validEmbeddings = embeddings.filter(e => e.length > 0)

      if (validEmbeddings.length === 0) {
        return {
          success: false,
          error: 'No valid embeddings generated'
        }
      }

      // Calculate similarity between embeddings to verify they're meaningful
      const similarities = this.calculateCosineSimilarities(validEmbeddings)

      return {
        success: true,
        results: {
          embeddingsGenerated: validEmbeddings.length,
          totalTexts: testTexts.length,
          averageDimensions: validEmbeddings[0]?.length || 0,
          similarities
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: `Bilingual test failed: ${message}`
      }
    }
  }

  /**
   * Calculate cosine similarities between embeddings
   */
  private calculateCosineSimilarities(embeddings: number[][]): number[] {
    const similarities: number[] = []
    
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const embeddingA = embeddings[i]
        const embeddingB = embeddings[j]
        if (embeddingA && embeddingB) {
          const similarity = this.cosineSimilarity(embeddingA, embeddingB)
          similarities.push(similarity)
        }
      }
    }
    
    return similarities
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      const valueA = a[i] || 0
      const valueB = b[i] || 0
      dotProduct += valueA * valueB
      normA += valueA * valueA
      normB += valueB * valueB
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService()
