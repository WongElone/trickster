/**
 * Document Processing Pipeline
 * Handles text extraction, chunking, and preparation for embeddings
 * Now uses LangChain RecursiveCharacterTextSplitter for better chunking
 */
import { processFile, type ProcessedFile } from '../utils/file-handlers'
import { langChainTextChunker, LangChainTextChunker } from './ai/langchain-text-chunker'

export interface DocumentChunk {
  text: string
  index: number
  startPosition: number
  endPosition: number
  wordCount: number
  characterCount: number
}

export interface ProcessedDocument {
  content: string
  format: string
  originalFilename: string
  sizeBytes: number
  metadata: {
    title?: string
    wordCount: number
    characterCount: number
  }
  chunks: DocumentChunk[]
}

export interface ChunkingOptions {
  maxChunkSize: number // Maximum characters per chunk
  overlapSize: number  // Overlap between chunks in characters
  preserveSentences: boolean // Try to break at sentence boundaries
  minChunkSize: number // Minimum chunk size to avoid tiny chunks
}

const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  maxChunkSize: 1000,
  overlapSize: 100,
  preserveSentences: true,
  minChunkSize: 100
}

/**
 * Main document processing function
 * Processes a document and chunks it for embeddings using LangChain
 */
export async function processDocumentForEmbeddings(
  content: string,
  filename: string,
  options: Partial<ChunkingOptions> = {}
): Promise<ProcessedDocument> {
  // First, process the file using existing file handlers
  const processedFile = processFile(content, filename)
  
  // Create chunks from the processed content using LangChain
  const chunks = await createTextChunks(processedFile.content, options)
  
  return {
    content: processedFile.content,
    format: processedFile.format,
    originalFilename: processedFile.originalFilename,
    sizeBytes: processedFile.sizeBytes,
    metadata: processedFile.metadata || {
      wordCount: 0,
      characterCount: processedFile.content.length
    },
    chunks
  }
}

/**
 * Creates text chunks from content for embedding generation using LangChain
 */
export async function createTextChunks(
  text: string,
  options: Partial<ChunkingOptions> = {}
): Promise<DocumentChunk[]> {
  if (!text || text.trim().length === 0) {
    return []
  }

  // Convert legacy options to LangChain options
  const langChainOptions = {
    chunkSize: options.maxChunkSize || DEFAULT_CHUNKING_OPTIONS.maxChunkSize,
    chunkOverlap: options.overlapSize || DEFAULT_CHUNKING_OPTIONS.overlapSize,
    minChunkSize: options.minChunkSize || DEFAULT_CHUNKING_OPTIONS.minChunkSize
  }

  // Use LangChain chunker
  const chunker = new LangChainTextChunker(langChainOptions)
  const langChainChunks = await chunker.chunkText(text)

  // Convert to legacy DocumentChunk format
  return langChainChunks.map(chunk => ({
    text: chunk.text,
    index: chunk.index,
    startPosition: chunk.metadata.startPosition,
    endPosition: chunk.metadata.endPosition,
    wordCount: chunk.metadata.wordCount,
    characterCount: chunk.metadata.charCount
  }))
}

/**
 * Finds the best sentence boundary within a range
 */
function findSentenceBoundary(text: string, start: number, end: number): number {
  // Look for sentence endings (., !, ?) followed by whitespace or end of text
  const sentenceEndings = /[.!?]\s+/g
  let lastBoundary = -1
  
  sentenceEndings.lastIndex = start
  let match
  
  while ((match = sentenceEndings.exec(text)) !== null) {
    if (match.index >= end) break
    lastBoundary = match.index + match[0].length
  }
  
  // If no sentence boundary found, look for paragraph breaks
  if (lastBoundary === -1) {
    const paragraphBreak = text.lastIndexOf('\n\n', end)
    if (paragraphBreak > start) {
      lastBoundary = paragraphBreak + 2
    }
  }
  
  // If still no boundary, look for single line breaks
  if (lastBoundary === -1) {
    const lineBreak = text.lastIndexOf('\n', end)
    if (lineBreak > start) {
      lastBoundary = lineBreak + 1
    }
  }
  
  return lastBoundary > start ? lastBoundary : end
}

/**
 * Counts words in text
 */
function countWords(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

/**
 * Validates chunking options
 */
export function validateChunkingOptions(options: Partial<ChunkingOptions>): ChunkingOptions {
  const validated: ChunkingOptions = { ...DEFAULT_CHUNKING_OPTIONS, ...options }
  
  // Ensure sensible constraints
  validated.maxChunkSize = Math.max(100, Math.min(validated.maxChunkSize, 4000))
  validated.overlapSize = Math.max(0, Math.min(validated.overlapSize, validated.maxChunkSize / 2))
  validated.minChunkSize = Math.max(50, Math.min(validated.minChunkSize, validated.maxChunkSize / 2))
  
  return validated
}

/**
 * Estimates the number of chunks for a given text
 */
export function estimateChunkCount(textLength: number, options: ChunkingOptions): number {
  if (textLength === 0) return 0
  
  const effectiveChunkSize = options.maxChunkSize - options.overlapSize
  return Math.ceil(textLength / effectiveChunkSize)
}

/**
 * Gets processing statistics for a document
 */
export function getProcessingStats(processedDoc: ProcessedDocument) {
  const totalChunks = processedDoc.chunks.length
  const avgChunkSize = totalChunks > 0 
    ? Math.round(processedDoc.chunks.reduce((sum, chunk) => sum + chunk.characterCount, 0) / totalChunks)
    : 0
  const avgWordsPerChunk = totalChunks > 0
    ? Math.round(processedDoc.chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0) / totalChunks)
    : 0

  return {
    originalSize: processedDoc.sizeBytes,
    totalChunks,
    avgChunkSize,
    avgWordsPerChunk,
    format: processedDoc.format,
    hasTitle: !!processedDoc.metadata?.title
  }
}
