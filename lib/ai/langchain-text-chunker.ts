/**
 * LangChain-based text chunking service for Trickster application
 * Uses RecursiveCharacterTextSplitter for better chunking performance
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { logger } from '../../utils/logger'
import { useServerConfig } from '../config'

export interface LangChainTextChunk {
  text: string
  index: number
  metadata: {
    startPosition: number
    endPosition: number
    wordCount: number
    charCount: number
    language?: 'en' | 'zh' | 'mixed'
    separatorUsed?: string | undefined
  }
}

export interface LangChainChunkingOptions {
  chunkSize?: number
  chunkOverlap?: number
  separators?: string[]
  keepSeparator?: boolean
  lengthFunction?: (text: string) => number
  minChunkSize?: number
  maxChunkSize?: number
}

export class LangChainTextChunker {
  private splitter: RecursiveCharacterTextSplitter
  private config: any

  constructor(options?: LangChainChunkingOptions) {
    this.config = useServerConfig()
    
    // Handle both old and new config structure for compatibility
    const chunkingConfig = this.config.fileProcessing?.chunking

    // Create RecursiveCharacterTextSplitter with configuration
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: options?.chunkSize || chunkingConfig.chunkSize,
      chunkOverlap: options?.chunkOverlap || chunkingConfig.chunkOverlap,
      separators: options?.separators || chunkingConfig.separators,
      keepSeparator: options?.keepSeparator ?? chunkingConfig.keepSeparator,
      lengthFunction: options?.lengthFunction || this.createLengthFunction()
    })
  }

  /**
   * Split text into chunks using LangChain RecursiveCharacterTextSplitter
   */
  async chunkText(text: string, documentId?: string): Promise<LangChainTextChunk[]> {
    if (!text || text.trim().length === 0) {
      logger.warn('Empty text provided for chunking', { documentId })
      return []
    }

    logger.debug('Starting LangChain text chunking', {
      documentId,
      textLength: text.length,
      chunkSize: this.splitter.chunkSize,
      chunkOverlap: this.splitter.chunkOverlap
    })

    try {
      // Use LangChain to split the text
      const documents = await this.splitter.createDocuments([text])
      
      // Convert to our chunk format with enhanced metadata
      const chunks: LangChainTextChunk[] = documents.map((doc, index) => {
        const chunkText = doc.pageContent
        const startPos = this.findTextPosition(text, chunkText, index)
        
        return {
          text: chunkText,
          index,
          metadata: {
            startPosition: startPos,
            endPosition: startPos + chunkText.length,
            wordCount: this.countWords(chunkText),
            charCount: chunkText.length,
            language: this.detectLanguage(chunkText),
            separatorUsed: this.detectSeparatorUsed(chunkText)
          }
        }
      })

      // Post-process chunks
      const processedChunks = this.postProcessChunks(chunks)

      logger.info('LangChain text chunking completed', {
        documentId,
        originalLength: text.length,
        chunksGenerated: processedChunks.length,
        averageChunkSize: processedChunks.length > 0 
          ? Math.round(processedChunks.reduce((sum, c) => sum + c.metadata.charCount, 0) / processedChunks.length) 
          : 0
      })

      return processedChunks

    } catch (error) {
      logger.error('LangChain chunking failed', { error, documentId })
      throw error
    }
  }

  /**
   * Create custom length function based on configuration
   */
  private createLengthFunction(): (text: string) => number {
    // const chunkingConfig = this.config.fileProcessing?.chunking
    // const lengthType = chunkingConfig?.lengthFunction || 'character'
    const lengthType = this.config.fileProcessing.chunking.lengthFunction
    
    if (lengthType === 'token') {
      // Simple token approximation (can be enhanced with actual tokenizer)
      return (text: string) => {
        // Rough approximation: 1 token ≈ 4 characters for mixed EN/ZH
        return Math.ceil(text.length / 4)
      }
    }
    
    // Default to character count
    return (text: string) => text.length
  }

  /**
   * Find the position of a chunk in the original text
   */
  private findTextPosition(originalText: string, chunkText: string, chunkIndex: number): number {
    // Simple approach: find first occurrence after previous chunks
    const searchStart = chunkIndex > 0 ? Math.max(0, chunkIndex * (this.splitter.chunkSize - this.splitter.chunkOverlap)) : 0
    const position = originalText.indexOf(chunkText, searchStart)
    return position >= 0 ? position : searchStart
  }

  /**
   * Detect the primary language of a text chunk
   */
  private detectLanguage(text: string): 'en' | 'zh' | 'mixed' {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g)
    const englishWords = text.match(/[a-zA-Z]+/g)
    
    const chineseCount = chineseChars ? chineseChars.length : 0
    const englishCount = englishWords ? englishWords.length : 0
    
    if (chineseCount > englishCount * 2) return 'zh'
    if (englishCount > chineseCount * 2) return 'en'
    return 'mixed'
  }

  /**
   * Detect which separator was likely used for this chunk
   */
  private detectSeparatorUsed(text: string): string | undefined {
    const separators = this.config.fileProcessing.chunking.separators
    // const chunkingConfig = this.config.fileProcessing?.chunking
    // const separators = chunkingConfig?.separators || ['\n\n', '\n', '. ', '。', ' ', '']
    
    for (const separator of separators) {
      if (separator && text.includes(separator)) {
        return separator
      }
    }
    
    return undefined
  }

  /**
   * Count words in text (supports both English and Chinese)
   */
  private countWords(text: string): number {
    // Chinese characters count as individual words
    const chineseChars = text.match(/[\u4e00-\u9fff]/g)
    const chineseCount = chineseChars ? chineseChars.length : 0
    
    // English words
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').match(/\b\w+\b/g)
    const englishCount = englishWords ? englishWords.length : 0
    
    return chineseCount + englishCount
  }

  /**
   * Post-process chunks to ensure quality
   */
  private postProcessChunks(chunks: LangChainTextChunk[]): LangChainTextChunk[] {
    const minSize = this.config.fileProcessing.chunking.minChunkSize
    const maxSize = this.config.fileProcessing.chunking.maxChunkSize
    // const chunkingConfig = this.config.fileProcessing?.chunking
    // const minSize = chunkingConfig?.minChunkSize || 100
    // const maxSize = chunkingConfig?.maxChunkSize || 2000
    
    return chunks
      .filter(chunk => chunk.metadata.charCount >= minSize)
      .map(chunk => {
        // Trim chunks that are too large
        if (chunk.metadata.charCount > maxSize) {
          const trimmedText = chunk.text.substring(0, maxSize)
          return {
            ...chunk,
            text: trimmedText,
            metadata: {
              ...chunk.metadata,
              charCount: trimmedText.length,
              wordCount: this.countWords(trimmedText),
              endPosition: chunk.metadata.startPosition + trimmedText.length
            }
          }
        }
        return chunk
      })
      .map((chunk, index) => ({
        ...chunk,
        index // Reindex after filtering
      }))
  }

  /**
   * Get chunking statistics
   */
  getChunkingStats(chunks: LangChainTextChunk[]): {
    totalChunks: number
    totalCharacters: number
    totalWords: number
    averageChunkSize: number
    averageWordCount: number
    minChunkSize: number
    maxChunkSize: number
    languageDistribution: { en: number; zh: number; mixed: number }
    separatorUsage: Record<string, number>
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        totalCharacters: 0,
        totalWords: 0,
        averageChunkSize: 0,
        averageWordCount: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        languageDistribution: { en: 0, zh: 0, mixed: 0 },
        separatorUsage: {}
      }
    }

    const totalCharacters = chunks.reduce((sum, chunk) => sum + chunk.metadata.charCount, 0)
    const totalWords = chunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0)
    const chunkSizes = chunks.map(chunk => chunk.metadata.charCount)
    
    // Language distribution
    const languageDistribution = chunks.reduce((acc, chunk) => {
      const lang = chunk.metadata.language || 'mixed'
      acc[lang] = (acc[lang] || 0) + 1
      return acc
    }, { en: 0, zh: 0, mixed: 0 })
    
    // Separator usage
    const separatorUsage = chunks.reduce((acc, chunk) => {
      const separator = chunk.metadata.separatorUsed || 'unknown'
      acc[separator] = (acc[separator] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalChunks: chunks.length,
      totalCharacters,
      totalWords,
      averageChunkSize: Math.round(totalCharacters / chunks.length),
      averageWordCount: Math.round(totalWords / chunks.length),
      minChunkSize: Math.min(...chunkSizes),
      maxChunkSize: Math.max(...chunkSizes),
      languageDistribution,
      separatorUsage
    }
  }
}

// Export singleton instance
export const langChainTextChunker = new LangChainTextChunker()
