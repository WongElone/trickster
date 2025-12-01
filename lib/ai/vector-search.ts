/**
 * Vector similarity search utilities for Trickster application
 * Handles semantic search using pgvector in Supabase
 */

import { createServerSupabaseAdminClient } from '../supabase'
import { logger } from '../../utils/logger'
import { DatabaseError } from '../../utils/errors'
import type { SearchResult } from '../../types/index'

export interface VectorSearchOptions {
  limit?: number
  threshold?: number
  topicId?: string
  documentIds?: string[]
}

export interface VectorSearchResult extends SearchResult {
  document_id: string
  chunk_text: string
  similarity_score: number
  chunk_index: number
  metadata?: {
    document_filename?: string
    topic_title?: string
    word_count?: number
  }
}

export class VectorSearchService {
  private supabase: ReturnType<typeof createServerSupabaseAdminClient>

  constructor() {
    this.supabase = createServerSupabaseAdminClient()
  }

  /**
   * Search for similar text chunks using vector similarity
   */
  async searchSimilar(
    queryVector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const {
        limit = 10,
        threshold = 0.7,
        topicId,
        documentIds
      } = options

      logger.debug('Performing vector similarity search', {
        vectorDimensions: queryVector.length,
        limit,
        threshold,
        topicId,
        documentIds: documentIds?.length
      })

      // Use the topic-scoped match_embeddings function if topicId is provided
      // Convert to halfvec format for 2048 dimensions
      const vectorString = `[${queryVector.join(',')}]`
      
      let data, error
      
      if (topicId) {
        // Use new topic-scoped function
        const result = await this.supabase
          .rpc('match_embeddings_by_topic', {
            query_embedding: vectorString,
            topic_uuid: topicId,
            match_threshold: threshold,
            match_count: limit
          })
        data = result.data
        error = result.error
      } else {
        // Fallback to original function for backward compatibility
        const result = await this.supabase
          .rpc('match_embeddings', {
            query_embedding: vectorString,
            match_threshold: threshold,
            match_count: limit
          })
        data = result.data
        error = result.error
      }

      if (error) {
        throw new DatabaseError(`Vector search failed: ${error?.message || 'Unknown error'}`, error)
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        logger.info('No similar chunks found', { threshold, topicId })
        return []
      }

      // Transform results - data is now properly typed from the RPC function
      const results: VectorSearchResult[] = (data as any[]).map((row: any) => ({
        document_id: row.document_id,
        chunk_text: row.chunk_text,
        similarity_score: row.similarity || 0,
        chunk_index: row.chunk_index,
        metadata: {
          word_count: this.countWords(row.chunk_text)
        }
      }))

      logger.info('Vector search completed', {
        resultsFound: results.length,
        averageSimilarity: results.length > 0 
          ? results.reduce((sum, r) => sum + r.similarity_score, 0) / results.length 
          : 0,
        topicScoped: !!topicId
      })

      return results

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown vector search error'
      logger.error('Vector search failed', { error: message, options })
      throw new DatabaseError(`Vector search failed: ${message}`, error as Error)
    }
  }

  /**
   * Search for similar chunks using text query (generates embedding first)
   */
  async searchByText(
    queryText: string,
    embeddingService: any, // Import would cause circular dependency
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      logger.debug('Searching by text query', {
        queryLength: queryText.length,
        options
      })

      // Generate embedding for the query text
      const queryVector = await embeddingService.generateEmbedding(queryText)

      // Perform vector search
      return await this.searchSimilar(queryVector, options)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown text search error'
      logger.error('Text search failed', { error: message, queryText: queryText.substring(0, 100) })
      throw new DatabaseError(`Text search failed: ${message}`, error as Error)
    }
  }

  /**
   * Search for similar chunks using text query with topic scoping
   * This method is optimized for topic-specific searches
   */
  async searchByTextInTopic(
    queryText: string,
    topicId: string,
    embeddingService: any,
    options: Omit<VectorSearchOptions, 'topicId'> = {}
  ): Promise<VectorSearchResult[]> {
    try {
      logger.debug('Searching by text query in topic', {
        queryLength: queryText.length,
        topicId,
        options
      })

      // Generate embedding for the query text
      const queryVector = await embeddingService.generateEmbedding(queryText)

      // Perform topic-scoped vector search
      return await this.searchSimilar(queryVector, { ...options, topicId })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown topic text search error'
      logger.error('Topic text search failed', { error: message, queryText: queryText.substring(0, 100), topicId })
      throw new DatabaseError(`Topic text search failed: ${message}`, error as Error)
    }
  }

  /**
   * Get context for RAG by finding relevant chunks
   */
  async getRAGContext(
    queryText: string,
    embeddingService: any,
    options: VectorSearchOptions & { maxContextLength?: number } = {}
  ): Promise<{
    context: string
    sources: VectorSearchResult[]
    totalChunks: number
    contextLength: number
  }> {
    try {
      const { maxContextLength = 4000, ...searchOptions } = options

      // Search for relevant chunks
      const results = await this.searchByText(queryText, embeddingService, {
        ...searchOptions,
        limit: searchOptions.limit || 20 // Get more results to select best context
      })

      if (results.length === 0) {
        return {
          context: '',
          sources: [],
          totalChunks: 0,
          contextLength: 0
        }
      }

      // Build context by combining chunks, respecting length limit
      let context = ''
      const selectedSources: VectorSearchResult[] = []
      
      for (const result of results) {
        const chunkWithSource = `[Source: ${result.metadata?.document_filename || 'Unknown'}]\n${result.chunk_text}\n\n`
        
        if (context.length + chunkWithSource.length <= maxContextLength) {
          context += chunkWithSource
          selectedSources.push(result)
        } else {
          break
        }
      }

      logger.info('RAG context assembled', {
        queryLength: queryText.length,
        chunksSelected: selectedSources.length,
        totalChunksFound: results.length,
        contextLength: context.length,
        averageSimilarity: selectedSources.length > 0
          ? selectedSources.reduce((sum, s) => sum + s.similarity_score, 0) / selectedSources.length
          : 0
      })

      return {
        context: context.trim(),
        sources: selectedSources,
        totalChunks: results.length,
        contextLength: context.length
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown RAG context error'
      logger.error('RAG context assembly failed', { error: message, queryText: queryText.substring(0, 100) })
      throw new DatabaseError(`RAG context assembly failed: ${message}`, error as Error)
    }
  }

  /**
   * Find similar documents based on a reference document
   */
  async findSimilarDocuments(
    documentId: string,
    options: VectorSearchOptions = {}
  ): Promise<{
    similarDocuments: Array<{
      document_id: string
      filename: string
      topic_title: string
      similarity_score: number
      chunk_count: number
    }>
  }> {
    try {
      logger.debug('Finding similar documents', { documentId, options })

      // Get embeddings for the reference document
      const { data: refEmbeddings, error: refError } = await this.supabase
        .from('embeddings')
        .select('vector')
        .eq('document_id', documentId)
        .limit(5) // Use first few chunks as reference

      if (refError || !refEmbeddings || refEmbeddings.length === 0) {
        throw new DatabaseError(`Could not find embeddings for document ${documentId}`)
      }

      // Calculate average vector from reference document chunks
      const validVectors = refEmbeddings.map(e => e.vector).filter((v): v is number[] => v !== null)
      const avgVector = this.calculateAverageVector(validVectors)

      // Search for similar chunks, excluding the reference document
      const results = await this.searchSimilar(avgVector, {
        ...options,
        limit: options.limit || 50
      })

      // Group by document and calculate document-level similarity
      const documentGroups = new Map<string, VectorSearchResult[]>()
      
      results
        .filter(r => r.document_id !== documentId) // Exclude reference document
        .forEach(result => {
          if (!documentGroups.has(result.document_id)) {
            documentGroups.set(result.document_id, [])
          }
          documentGroups.get(result.document_id)!.push(result)
        })

      // Calculate document similarity scores
      const similarDocuments = Array.from(documentGroups.entries())
        .map(([docId, chunks]) => {
          const firstChunk = chunks[0]
          return {
            document_id: docId,
            filename: firstChunk?.metadata?.document_filename || 'Unknown',
            topic_title: firstChunk?.metadata?.topic_title || 'Unknown',
            similarity_score: chunks.reduce((sum, c) => sum + c.similarity_score, 0) / chunks.length,
            chunk_count: chunks.length
          }
        })
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, options.limit || 10)

      logger.info('Similar documents found', {
        referenceDocument: documentId,
        similarDocuments: similarDocuments.length
      })

      return { similarDocuments }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown similar documents error'
      logger.error('Find similar documents failed', { error: message, documentId })
      throw new DatabaseError(`Find similar documents failed: ${message}`, error as Error)
    }
  }

  /**
   * Calculate average vector from multiple vectors
   */
  private calculateAverageVector(vectors: number[][]): number[] {
    if (vectors.length === 0) return []
    if (vectors.length === 1) return vectors[0] || []

    const firstVector = vectors[0]
    if (!firstVector) return []
    
    const dimensions = firstVector.length
    const avgVector = new Array(dimensions).fill(0)

    for (const vector of vectors) {
      for (let i = 0; i < dimensions; i++) {
        avgVector[i] += vector[i]
      }
    }

    return avgVector.map(val => val / vectors.length)
  }

  /**
   * Count words in text (supports both English and Chinese)
   */
  private countWords(text: string): number {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g)
    const chineseCount = chineseChars ? chineseChars.length : 0
    
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').match(/\b\w+\b/g)
    const englishCount = englishWords ? englishWords.length : 0
    
    return chineseCount + englishCount
  }

  /**
   * Create the vector search function in Supabase (run this once during setup)
   */
  async createVectorSearchFunction(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('create_match_embeddings_function')
      
      if (error) {
        throw new DatabaseError(`Failed to create vector search function: ${error?.message || 'Unknown error'}`, error)
      }

      logger.info('Vector search function created successfully')

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown function creation error'
      logger.error('Vector search function creation failed', { error: message })
      throw new DatabaseError(`Vector search function creation failed: ${message}`, error as Error)
    }
  }
}

// Export singleton instance
export const vectorSearchService = new VectorSearchService()
