/**
 * Content Pagination Service
 * Handles pagination for large content responses across the application
 */

export interface PaginationOptions {
  page?: number
  limit?: number
  maxLimit?: number
  defaultLimit?: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    startIndex: number
    endIndex: number
  }
}

export interface ContentChunk {
  index: number
  content: string
  characterCount: number
  wordCount: number
  startPosition: number
  endPosition: number
}

export interface PaginatedContent {
  chunks: ContentChunk[]
  totalChunks: number
  totalCharacters: number
  totalWords: number
  chunkSize: number
  pagination: {
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export class ContentPaginationService {
  private defaultOptions = {
    defaultLimit: 20,
    maxLimit: 100
  }

  /**
   * Create pagination metadata
   */
  createPagination(
    totalCount: number,
    options: PaginationOptions = {}
  ): { page: number; limit: number; offset: number; totalPages: number; hasNext: boolean; hasPrev: boolean } {
    const page = Math.max(1, options.page || 1)
    const limit = Math.min(
      options.limit || options.defaultLimit || this.defaultOptions.defaultLimit,
      options.maxLimit || this.defaultOptions.maxLimit
    )
    const offset = (page - 1) * limit
    const totalPages = Math.ceil(totalCount / limit)
    
    return {
      page,
      limit,
      offset,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }

  /**
   * Paginate array data
   */
  paginateArray<T>(
    data: T[],
    options: PaginationOptions = {}
  ): PaginationResult<T> {
    const totalCount = data.length
    const paginationInfo = this.createPagination(totalCount, options)
    
    const startIndex = paginationInfo.offset
    const endIndex = Math.min(startIndex + paginationInfo.limit, totalCount)
    const paginatedData = data.slice(startIndex, endIndex)

    return {
      data: paginatedData,
      pagination: {
        page: paginationInfo.page,
        limit: paginationInfo.limit,
        totalCount,
        totalPages: paginationInfo.totalPages,
        hasNext: paginationInfo.hasNext,
        hasPrev: paginationInfo.hasPrev,
        startIndex,
        endIndex: endIndex - 1
      }
    }
  }

  /**
   * Paginate long text content into chunks
   */
  paginateTextContent(
    content: string,
    options: {
      chunkSize?: number
      page?: number
      limit?: number
      preserveWords?: boolean
      overlapSize?: number
    } = {}
  ): PaginatedContent {
    const chunkSize = options.chunkSize || 2000 // Default 2000 characters per chunk
    const preserveWords = options.preserveWords !== false // Default true
    const overlapSize = options.overlapSize || 0
    const page = Math.max(1, options.page || 1)
    const limit = Math.min(options.limit || 10, 50) // Max 50 chunks per page

    // Create content chunks
    const chunks = this.createTextChunks(content, chunkSize, preserveWords, overlapSize)
    
    // Paginate chunks
    const totalChunks = chunks.length
    const offset = (page - 1) * limit
    const paginatedChunks = chunks.slice(offset, offset + limit)

    return {
      chunks: paginatedChunks,
      totalChunks,
      totalCharacters: content.length,
      totalWords: this.estimateWordCount(content),
      chunkSize,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalChunks / limit),
        hasNext: offset + limit < totalChunks,
        hasPrev: page > 1
      }
    }
  }

  /**
   * Create text chunks from content
   */
  private createTextChunks(
    content: string,
    chunkSize: number,
    preserveWords: boolean,
    overlapSize: number
  ): ContentChunk[] {
    const chunks: ContentChunk[] = []
    let position = 0
    let chunkIndex = 0

    while (position < content.length) {
      let endPosition = Math.min(position + chunkSize, content.length)
      
      // If preserveWords is true, adjust end position to avoid breaking words
      if (preserveWords && endPosition < content.length) {
        // Look for the last space or punctuation before the chunk boundary
        const searchStart = Math.max(position, endPosition - 100) // Look back up to 100 chars
        let lastBreak = -1
        
        for (let i = endPosition; i >= searchStart; i--) {
          const char = content[i]
          if (char === ' ' || char === '\n' || char === '\t' || 
              char === '.' || char === '!' || char === '?' || 
              char === ',' || char === ';' || char === ':') {
            lastBreak = i
            break
          }
        }
        
        if (lastBreak > position) {
          endPosition = lastBreak + 1
        }
      }

      const chunkContent = content.slice(position, endPosition).trim()
      
      if (chunkContent.length > 0) {
        chunks.push({
          index: chunkIndex,
          content: chunkContent,
          characterCount: chunkContent.length,
          wordCount: this.estimateWordCount(chunkContent),
          startPosition: position,
          endPosition: endPosition
        })
        chunkIndex++
      }

      // Move position forward, accounting for overlap
      position = endPosition - overlapSize
      if (chunks.length > 0 && position <= (chunks[chunks.length - 1]?.startPosition || 0)) {
        position = endPosition // Prevent infinite loop
      }
    }

    return chunks
  }

  /**
   * Estimate word count from text
   */
  private estimateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Create search result pagination with highlighting
   */
  paginateSearchResults<T extends { content?: string }>(
    results: T[],
    searchQuery: string,
    options: PaginationOptions & { highlightLength?: number } = {}
  ): PaginationResult<T & { highlight?: string }> {
    const highlightLength = options.highlightLength || 200
    
    // Add highlights to results
    const highlightedResults = results.map(result => {
      if (result.content && searchQuery) {
        const highlight = this.createHighlight(result.content, searchQuery, highlightLength)
        return { ...result, highlight }
      }
      return result
    })

    return this.paginateArray(highlightedResults, options)
  }

  /**
   * Create content highlight around search terms
   */
  private createHighlight(content: string, searchQuery: string, maxLength: number): string {
    const query = searchQuery.toLowerCase()
    const contentLower = content.toLowerCase()
    const queryIndex = contentLower.indexOf(query)
    
    if (queryIndex === -1) {
      // No match found, return beginning of content
      return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '')
    }

    // Calculate highlight window around the match
    const halfLength = Math.floor(maxLength / 2)
    const start = Math.max(0, queryIndex - halfLength)
    const end = Math.min(content.length, start + maxLength)
    
    let highlight = content.slice(start, end)
    
    // Add ellipsis if truncated
    if (start > 0) highlight = '...' + highlight
    if (end < content.length) highlight = highlight + '...'
    
    return highlight
  }

  /**
   * Validate pagination parameters
   */
  validatePaginationParams(params: {
    page?: string | number
    limit?: string | number
    maxLimit?: number
  }): { page: number; limit: number; errors: string[] } {
    const errors: string[] = []
    
    let page = 1
    let limit = this.defaultOptions.defaultLimit
    const maxLimit = params.maxLimit || this.defaultOptions.maxLimit

    // Validate page
    if (params.page !== undefined) {
      const pageNum = typeof params.page === 'string' ? parseInt(params.page) : params.page
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Page must be a positive integer')
      } else {
        page = pageNum
      }
    }

    // Validate limit
    if (params.limit !== undefined) {
      const limitNum = typeof params.limit === 'string' ? parseInt(params.limit) : params.limit
      if (isNaN(limitNum) || limitNum < 1) {
        errors.push('Limit must be a positive integer')
      } else if (limitNum > maxLimit) {
        errors.push(`Limit cannot exceed ${maxLimit}`)
      } else {
        limit = limitNum
      }
    }

    return { page, limit, errors }
  }
}

// Export singleton instance
export const contentPaginationService = new ContentPaginationService()
