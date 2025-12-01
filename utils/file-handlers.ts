/**
 * File handling utilities for Trickster application
 * Supports multiple file formats: txt, markdown, html
 */

import { logger } from './logger'
import { useServerConfig } from '../lib/config'

export type SupportedFileFormat = 'txt' | 'md' | 'html' | 'markdown'

export interface ProcessedFile {
  content: string
  format: SupportedFileFormat
  originalFilename: string
  sizeBytes: number
  metadata?: {
    title?: string
    wordCount: number
    characterCount: number
  }
}

/**
 * Determines file format from filename extension
 */
export function getFileFormat(filename: string): SupportedFileFormat | null {
  const extension = filename.toLowerCase().split('.').pop()
  
  switch (extension) {
    case 'txt':
      return 'txt'
    case 'md':
    case 'markdown':
      return 'markdown'
    case 'html':
    case 'htm':
      return 'html'
    default:
      return null
  }
}

/**
 * Validates if file format is supported
 */
export function isSupportedFormat(filename: string): boolean {
  const config = useServerConfig()
  const extension = filename.toLowerCase().split('.').pop()
  return config.fileProcessing.supportedFormats.includes(extension || '')
}

/**
 * Processes plain text files
 */
export function processTextFile(content: string, filename: string): ProcessedFile {
  const cleanContent = content.trim()
  
  return {
    content: cleanContent,
    format: 'txt',
    originalFilename: filename,
    sizeBytes: Buffer.byteLength(cleanContent, 'utf8'),
    metadata: {
      wordCount: countWords(cleanContent),
      characterCount: cleanContent.length
    }
  }
}

/**
 * Processes Markdown files
 */
export function processMarkdownFile(content: string, filename: string): ProcessedFile {
  const cleanContent = content.trim()
  
  // Extract title from first heading if available
  const titleMatch = cleanContent.match(/^#\s+(.+)$/m)
  const title = titleMatch?.[1]?.trim()
  
  return {
    content: cleanContent,
    format: 'markdown',
    originalFilename: filename,
    sizeBytes: Buffer.byteLength(cleanContent, 'utf8'),
    metadata: {
      ...(title && { title }),
      wordCount: countWords(cleanContent),
      characterCount: cleanContent.length
    }
  }
}

/**
 * Processes HTML files - extracts text content
 */
export function processHtmlFile(content: string, filename: string): ProcessedFile {
  // Basic HTML tag removal for text extraction
  // Note: For production, consider using a proper HTML parser like jsdom
  let textContent = content
    // Remove script and style tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Extract title from HTML title tag if available
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch?.[1]?.trim()

  return {
    content: textContent,
    format: 'html',
    originalFilename: filename,
    sizeBytes: Buffer.byteLength(textContent, 'utf8'),
    metadata: {
      ...(title && { title }),
      wordCount: countWords(textContent),
      characterCount: textContent.length
    }
  }
}

/**
 * Main file processor - routes to appropriate handler based on format
 */
export function processFile(content: string, filename: string): ProcessedFile {
  const format = getFileFormat(filename)
  
  if (!format) {
    throw new Error(`Unsupported file format for file: ${filename}`)
  }

  switch (format) {
    case 'txt':
      return processTextFile(content, filename)
    case 'markdown':
      return processMarkdownFile(content, filename)
    case 'html':
      return processHtmlFile(content, filename)
    default:
      throw new Error(`Handler not implemented for format: ${format}`)
  }
}

/**
 * Counts words in text content
 */
function countWords(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

/**
 * Validates file size (max 10MB)
 */
export function validateFileSize(sizeBytes: number): boolean {
  const maxSize = 10 * 1024 * 1024 // 10MB
  return sizeBytes <= maxSize
}

/**
 * Generates a safe filename for storage
 */
export function generateSafeFilename(originalFilename: string, topicId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const extension = originalFilename.split('.').pop()
  const baseName = originalFilename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9\-_]/g, '_') // Replace special chars
    .substring(0, 50) // Limit length
  
  return `${topicId}_${timestamp}_${baseName}.${extension}`
}
