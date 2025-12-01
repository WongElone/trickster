/**
 * Context Assembly Service
 * Intelligently assembles and ranks context from vector search results for RAG
 */
import { createServerSupabaseAdminClient } from './supabase'
import { embeddingService } from './ai/embedding-service'
import type { VectorSearchResult } from './ai/vector-search'
import { useServerConfig } from './config'

export interface ContextChunk {
  id: string
  text: string
  similarity: number
  documentId: string
  documentFilename: string
  chunkIndex: number
  wordCount: number
  characterCount: number
  metadata?: {
    topicTitle?: string
    documentFormat?: string
    uploadedAt?: string
  }
}

export interface AssembledContext {
  chunks: ContextChunk[]
  totalChunks: number
  totalCharacters: number
  totalWords: number
  averageSimilarity: number
  documentCoverage: {
    totalDocuments: number
    documentsRepresented: number
    documentBreakdown: Array<{
      documentId: string
      filename: string
      chunkCount: number
      avgSimilarity: number
    }>
  }
  contextSummary: string
  assemblyMetadata: {
    searchQuery: string
    threshold: number
    maxChunks: number
    assemblyStrategy: string
    processingTime: number
  }
}

export interface ContextAssemblyOptions {
  maxChunks?: number
  maxCharacters?: number
  similarityThreshold?: number
  diversityWeight?: number // 0-1, higher values prefer diverse documents
  coherenceWeight?: number // 0-1, higher values prefer coherent chunks
  strategy?: 'similarity' | 'diversity' | 'balanced' | 'comprehensive'
  includeMetadata?: boolean
}

function getDefaultOptions(): Required<ContextAssemblyOptions> {
  const config = useServerConfig()
  return {
    maxChunks: config.contextAssembly.defaultMaxChunks,
    maxCharacters: config.contextAssembly.defaultMaxCharacters,
    similarityThreshold: config.contextAssembly.defaultSimilarityThreshold,
    diversityWeight: config.contextAssembly.diversityWeight,
    coherenceWeight: config.contextAssembly.coherenceWeight,
    strategy: config.contextAssembly.defaultStrategy as 'similarity' | 'diversity' | 'balanced' | 'comprehensive',
    includeMetadata: config.contextAssembly.defaultIncludeMetadata
  }
}

export class ContextAssemblyService {
  private supabase: ReturnType<typeof createServerSupabaseAdminClient>

  constructor() {
    this.supabase = createServerSupabaseAdminClient()
  }

  /**
   * Main context assembly method
   */
  async assembleContext(
    query: string,
    topicId: string,
    options: ContextAssemblyOptions = {}
  ): Promise<AssembledContext> {
    const startTime = Date.now()
    const defaultOptions = getDefaultOptions()
    const opts = { ...defaultOptions, ...options }

    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query)
    if (!queryEmbedding || queryEmbedding.length === 0) {
      throw new Error('Failed to generate query embedding')
    }

    // Perform vector search with higher limit for better selection
    const config = useServerConfig()
    const searchLimit = Math.min(opts.maxChunks * config.contextAssembly.searchMultiplier, config.ai.vectorSearch.maxLimit)
    const { data: searchResults, error } = await this.supabase.rpc('match_embeddings_by_topic', {
      query_embedding: JSON.stringify(queryEmbedding),
      topic_uuid: topicId,
      match_threshold: opts.similarityThreshold,
      match_count: searchLimit
    })

    if (error) {
      throw new Error(`Vector search failed: ${error?.message || 'Unknown error'}`)
    }

    if (!searchResults || searchResults.length === 0) {
      return this.createEmptyContext(query, opts, Date.now() - startTime)
    }

    // Filter results to only include chunks from the specified topic
    const topicFilteredResults = await this.filterByTopic(searchResults, topicId)
    
    if (topicFilteredResults.length === 0) {
      return this.createEmptyContext(query, opts, Date.now() - startTime)
    }

    // Enrich results with document metadata
    const enrichedChunks = await this.enrichWithMetadata(topicFilteredResults)

    // Apply assembly strategy to select and rank chunks
    const selectedChunks = this.applyAssemblyStrategy(enrichedChunks, opts)

    // Generate context summary
    const contextSummary = this.generateContextSummary(selectedChunks, query)

    // Calculate document coverage statistics
    const documentCoverage = this.calculateDocumentCoverage(selectedChunks)

    const processingTime = Date.now() - startTime

    return {
      chunks: selectedChunks,
      totalChunks: selectedChunks.length,
      totalCharacters: selectedChunks.reduce((sum, chunk) => sum + chunk.characterCount, 0),
      totalWords: selectedChunks.reduce((sum, chunk) => sum + chunk.wordCount, 0),
      averageSimilarity: selectedChunks.length > 0 
        ? selectedChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / selectedChunks.length 
        : 0,
      documentCoverage,
      contextSummary,
      assemblyMetadata: {
        searchQuery: query,
        threshold: opts.similarityThreshold,
        maxChunks: opts.maxChunks,
        assemblyStrategy: opts.strategy,
        processingTime
      }
    }
  }

  /**
   * Filter search results to only include chunks from the specified topic
   */
  private async filterByTopic(searchResults: any[] | null, topicId: string): Promise<any[]> {
    if (!searchResults) return []
    const documentIds = [...new Set(searchResults.map(r => r.document_id))]
    
    const { data: topicDocuments } = await this.supabase
      .from('documents')
      .select('id')
      .in('id', documentIds)
      .eq('topic_id', topicId)

    const validDocumentIds = new Set(topicDocuments?.map(doc => doc.id) || [])
    
    return searchResults.filter(result => validDocumentIds.has(result.document_id))
  }

  /**
   * Enrich search results with document metadata
   */
  private async enrichWithMetadata(searchResults: any[]): Promise<ContextChunk[]> {
    const documentIds = [...new Set(searchResults.map(r => r.document_id))]
    
    const { data: documents } = await this.supabase
      .from('documents')
      .select(`
        id,
        original_filename,
        format,
        uploaded_at,
        topics (
          id,
          title
        )
      `)
      .in('id', documentIds)

    const documentMap = new Map()
    if (documents) {
      documents.forEach(doc => documentMap.set(doc.id, doc))
    }

    return searchResults.map(result => {
      const doc = documentMap.get(result.document_id)
      const wordCount = this.estimateWordCount(result.chunk_text)
      
      return {
        id: result.id,
        text: result.chunk_text,
        similarity: result.similarity,
        documentId: result.document_id,
        documentFilename: doc?.original_filename || 'Unknown',
        chunkIndex: result.chunk_index,
        wordCount,
        characterCount: result.chunk_text.length,
        ...(doc && {
          metadata: {
            topicTitle: doc.topics?.title,
            documentFormat: doc.format,
            uploadedAt: doc.uploaded_at
          }
        })
      }
    })
  }

  /**
   * Apply the selected assembly strategy to rank and select chunks
   */
  private applyAssemblyStrategy(chunks: ContextChunk[], options: Required<ContextAssemblyOptions>): ContextChunk[] {
    let selectedChunks: ContextChunk[]

    switch (options.strategy) {
      case 'similarity':
        selectedChunks = this.applySimilarityStrategy(chunks, options)
        break
      case 'diversity':
        selectedChunks = this.applyDiversityStrategy(chunks, options)
        break
      case 'comprehensive':
        selectedChunks = this.applyComprehensiveStrategy(chunks, options)
        break
      case 'balanced':
      default:
        selectedChunks = this.applyBalancedStrategy(chunks, options)
        break
    }

    // Apply character limit if specified
    if (options.maxCharacters > 0) {
      selectedChunks = this.applyCharacterLimit(selectedChunks, options.maxCharacters)
    }

    return selectedChunks
  }

  /**
   * Similarity-based strategy: Select highest similarity chunks
   */
  private applySimilarityStrategy(chunks: ContextChunk[], options: Required<ContextAssemblyOptions>): ContextChunk[] {
    return chunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.maxChunks)
  }

  /**
   * Diversity-based strategy: Prefer chunks from different documents
   */
  private applyDiversityStrategy(chunks: ContextChunk[], options: Required<ContextAssemblyOptions>): ContextChunk[] {
    const selected: ContextChunk[] = []
    const usedDocuments = new Set<string>()
    
    // First pass: one chunk per document, highest similarity
    const sortedChunks = [...chunks].sort((a, b) => b.similarity - a.similarity)
    
    for (const chunk of sortedChunks) {
      if (!usedDocuments.has(chunk.documentId) && selected.length < options.maxChunks) {
        selected.push(chunk)
        usedDocuments.add(chunk.documentId)
      }
    }
    
    // Second pass: fill remaining slots with highest similarity
    for (const chunk of sortedChunks) {
      if (selected.length >= options.maxChunks) break
      if (!selected.some(s => s.id === chunk.id)) {
        selected.push(chunk)
      }
    }
    
    return selected.slice(0, options.maxChunks)
  }

  /**
   * Balanced strategy: Combine similarity and diversity
   */
  private applyBalancedStrategy(chunks: ContextChunk[], options: Required<ContextAssemblyOptions>): ContextChunk[] {
    // Calculate composite scores
    const documentCounts = new Map<string, number>()
    chunks.forEach(chunk => {
      documentCounts.set(chunk.documentId, (documentCounts.get(chunk.documentId) || 0) + 1)
    })

    const scoredChunks = chunks.map(chunk => {
      const diversityScore = 1 / (documentCounts.get(chunk.documentId) || 1)
      const compositeScore = 
        (chunk.similarity * options.coherenceWeight) + 
        (diversityScore * options.diversityWeight)
      
      return { ...chunk, compositeScore }
    })

    return scoredChunks
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, options.maxChunks)
  }

  /**
   * Comprehensive strategy: Try to include context from all available documents
   */
  private applyComprehensiveStrategy(chunks: ContextChunk[], options: Required<ContextAssemblyOptions>): ContextChunk[] {
    const documentGroups = new Map<string, ContextChunk[]>()
    
    chunks.forEach(chunk => {
      if (!documentGroups.has(chunk.documentId)) {
        documentGroups.set(chunk.documentId, [])
      }
      documentGroups.get(chunk.documentId)!.push(chunk)
    })

    const selected: ContextChunk[] = []
    const chunksPerDocument = Math.max(1, Math.floor(options.maxChunks / documentGroups.size))
    
    // Distribute chunks across documents
    for (const [documentId, docChunks] of documentGroups) {
      const sortedDocChunks = docChunks.sort((a, b) => b.similarity - a.similarity)
      const toTake = Math.min(chunksPerDocument, sortedDocChunks.length)
      selected.push(...sortedDocChunks.slice(0, toTake))
    }

    // Fill remaining slots with highest similarity chunks
    const remaining = options.maxChunks - selected.length
    if (remaining > 0) {
      const unusedChunks = chunks.filter(chunk => !selected.some(s => s.id === chunk.id))
      const topRemaining = unusedChunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, remaining)
      selected.push(...topRemaining)
    }

    return selected.slice(0, options.maxChunks)
  }

  /**
   * Apply character limit while preserving chunk integrity
   */
  private applyCharacterLimit(chunks: ContextChunk[], maxCharacters: number): ContextChunk[] {
    const result: ContextChunk[] = []
    let totalCharacters = 0

    for (const chunk of chunks) {
      if (totalCharacters + chunk.characterCount <= maxCharacters) {
        result.push(chunk)
        totalCharacters += chunk.characterCount
      } else {
        break
      }
    }

    return result
  }

  /**
   * Generate a summary of the assembled context
   */
  private generateContextSummary(chunks: ContextChunk[], query: string): string {
    if (chunks.length === 0) {
      return `No relevant context found for query: "${query}"`
    }

    const documentCount = new Set(chunks.map(c => c.documentId)).size
    const avgSimilarity = chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length
    
    return `Found ${chunks.length} relevant chunks from ${documentCount} document(s) with average similarity of ${(avgSimilarity * 100).toFixed(1)}% for query: "${query}"`
  }

  /**
   * Calculate document coverage statistics
   */
  private calculateDocumentCoverage(chunks: ContextChunk[]) {
    const documentStats = new Map<string, { filename: string; chunks: ContextChunk[] }>()
    
    chunks.forEach(chunk => {
      if (!documentStats.has(chunk.documentId)) {
        documentStats.set(chunk.documentId, {
          filename: chunk.documentFilename,
          chunks: []
        })
      }
      documentStats.get(chunk.documentId)!.chunks.push(chunk)
    })

    const documentBreakdown = Array.from(documentStats.entries()).map(([documentId, stats]) => ({
      documentId,
      filename: stats.filename,
      chunkCount: stats.chunks.length,
      avgSimilarity: stats.chunks.reduce((sum, c) => sum + c.similarity, 0) / stats.chunks.length
    }))

    return {
      totalDocuments: documentStats.size,
      documentsRepresented: documentStats.size,
      documentBreakdown
    }
  }

  /**
   * Create empty context response
   */
  private createEmptyContext(query: string, options: Required<ContextAssemblyOptions>, processingTime: number): AssembledContext {
    return {
      chunks: [],
      totalChunks: 0,
      totalCharacters: 0,
      totalWords: 0,
      averageSimilarity: 0,
      documentCoverage: {
        totalDocuments: 0,
        documentsRepresented: 0,
        documentBreakdown: []
      },
      contextSummary: `No relevant context found for query: "${query}"`,
      assemblyMetadata: {
        searchQuery: query,
        threshold: options.similarityThreshold,
        maxChunks: options.maxChunks,
        assemblyStrategy: options.strategy,
        processingTime
      }
    }
  }

  /**
   * Estimate word count from text
   */
  private estimateWordCount(text: string): number {
    return text.trim().split(/\s+/).length
  }
}

// Export singleton instance
export const contextAssemblyService = new ContextAssemblyService()
