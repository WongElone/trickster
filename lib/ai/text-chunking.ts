/**
 * Text chunking utilities for Trickster application
 * Now uses LangChain RecursiveCharacterTextSplitter for better performance
 */

import { langChainTextChunker, type LangChainTextChunk } from './langchain-text-chunker'

// Legacy interface for backward compatibility (converted from LangChain format)
export interface TextChunk {
  text: string
  index: number
  startPosition: number
  endPosition: number
  wordCount: number
  charCount: number
}

// Re-export LangChain types for new usage
export type { LangChainTextChunk } from './langchain-text-chunker'
export { LangChainTextChunker } from './langchain-text-chunker'

/**
 * Legacy TextChunker class - now uses LangChain internally
 */
export class TextChunker {
  /**
   * @deprecated Use langChainTextChunker directly for better features
   */
  constructor() {
    // No-op constructor for compatibility
  }

  /**
   * Split text into chunks - now uses LangChain internally
   */
  async chunkText(text: string, documentId?: string): Promise<TextChunk[]> {
    // Use the new LangChain chunker and convert to legacy format
    const langChainChunks = await langChainTextChunker.chunkText(text, documentId)
    
    return langChainChunks.map(chunk => ({
      text: chunk.text,
      index: chunk.index,
      startPosition: chunk.metadata.startPosition,
      endPosition: chunk.metadata.endPosition,
      wordCount: chunk.metadata.wordCount,
      charCount: chunk.metadata.charCount
    }))
  }
}

// Export singleton instance
export const textChunker = new TextChunker()
