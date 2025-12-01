/**
 * Content API - Search What-If scenarios with pagination
 * Searches through What-If content with full-text search and pagination
 */
import { createServerSupabaseAdminClient } from '../../../../lib/supabase'
import { contentPaginationService } from '../../../../lib/content-pagination'

interface SearchRequest {
  query: string
  topicId?: string
  searchIn?: 'prompt' | 'content' | 'both'
  page?: number
  limit?: number
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await readBody<SearchRequest>(event)

    // Validate request
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Search query is required'
      })
    }

    // Validate pagination parameters
    const { page, limit, errors } = contentPaginationService.validatePaginationParams({
      page: body.page || 1,
      limit: body.limit || 10,
      maxLimit: 20 // Max 20 results per page for search
    })

    if (errors.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid pagination parameters',
        data: { errors }
      })
    }

    const searchQuery = body.query.trim()
    const searchIn = body.searchIn || 'both'

    // Build database query
    let dbQuery = supabase
      .from('what_ifs')
      .select(`
        *,
        topics (
          id,
          title,
          description
        )
      `)

    // Apply topic filter if specified
    if (body.topicId) {
      dbQuery = dbQuery.eq('topic_id', body.topicId)
    }

    // Apply text search based on searchIn parameter
    if (searchIn === 'prompt' || searchIn === 'both') {
      dbQuery = dbQuery.ilike('prompt', `%${searchQuery}%`)
    }

    // Get all matching scenarios from database
    const { data: whatIfs, error: searchError } = await dbQuery
      .order('created_at', { ascending: false })

    if (searchError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Search failed',
        data: searchError
      })
    }

    if (!whatIfs || whatIfs.length === 0) {
      return {
        success: true,
        results: [],
        pagination: {
          page: 1,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        searchMetadata: {
          query: searchQuery,
          searchIn,
          topicId: body.topicId || null,
          resultsFound: 0
        }
      }
    }

    // If searching in content, search in database content field
    let filteredResults = whatIfs
    let contentSearchResults: Array<{
      whatIf: any
      contentMatches: Array<{
        snippet: string
        position: number
        score: number
      }>
    }> = []

    if (searchIn === 'content' || searchIn === 'both') {
      contentSearchResults = []

      for (const whatIf of whatIfs) {
        if (whatIf.content && whatIf.content.length > 0) {
          const matches = searchInContent(whatIf.content, searchQuery)
          
          if (matches.length > 0 || searchIn === 'both') {
            contentSearchResults.push({
              whatIf,
              contentMatches: matches
            })
          }
        } else if (searchIn === 'both') {
          // Include scenarios without content when searching in 'both'
          contentSearchResults.push({
            whatIf,
            contentMatches: []
          })
        }
      }

      // Filter results based on content search if only searching content
      if (searchIn === 'content') {
        filteredResults = contentSearchResults
          .filter(result => result.contentMatches.length > 0)
          .map(result => result.whatIf)
      }
    }

    // Prepare results with highlights and pagination
    const resultsWithHighlights = filteredResults.map(whatIf => {
      const contentResult = contentSearchResults.find(cr => cr.whatIf.id === whatIf.id)
      
      return {
        id: whatIf.id,
        prompt: whatIf.prompt,
        title: whatIf.title,
        createdAt: whatIf.created_at,
        wordCount: whatIf.word_count,
        topic: whatIf.topics ? {
          id: whatIf.topics.id,
          title: whatIf.topics.title
        } : null,
        searchHighlights: {
          promptMatch: searchIn !== 'content' && whatIf.prompt && whatIf.prompt.toLowerCase().includes(searchQuery.toLowerCase()),
          contentMatches: contentResult?.contentMatches || [],
          totalMatches: (contentResult?.contentMatches.length || 0) + 
                       (whatIf.prompt && whatIf.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0)
        }
      }
    })

    // Sort by relevance (total matches descending, then by creation date)
    resultsWithHighlights.sort((a, b) => {
      const relevanceA = a.searchHighlights.totalMatches
      const relevanceB = b.searchHighlights.totalMatches
      
      if (relevanceA !== relevanceB) {
        return relevanceB - relevanceA
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Apply pagination
    const paginatedResults = contentPaginationService.paginateArray(resultsWithHighlights, {
      page,
      limit
    })

    return {
      success: true,
      results: paginatedResults.data,
      pagination: paginatedResults.pagination,
      searchMetadata: {
        query: searchQuery,
        searchIn,
        topicId: body.topicId || null,
        resultsFound: paginatedResults.pagination.totalCount,
        contentSearchPerformed: searchIn === 'content' || searchIn === 'both',
        filesSearched: contentSearchResults.length
      }
    }

  } catch (error) {
    console.error('Error in What-If content search:', error)
    
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

// Helper function to search within content
function searchInContent(content: string, query: string): Array<{
  snippet: string
  position: number
  score: number
}> {
  const matches: Array<{ snippet: string; position: number; score: number }> = []
  const queryLower = query.toLowerCase()
  const contentLower = content.toLowerCase()
  
  let searchPos = 0
  while (true) {
    const matchPos = contentLower.indexOf(queryLower, searchPos)
    if (matchPos === -1) break
    
    // Create snippet around the match
    const snippetStart = Math.max(0, matchPos - 100)
    const snippetEnd = Math.min(content.length, matchPos + query.length + 100)
    let snippet = content.slice(snippetStart, snippetEnd)
    
    // Add ellipsis if truncated
    if (snippetStart > 0) snippet = '...' + snippet
    if (snippetEnd < content.length) snippet = snippet + '...'
    
    // Calculate relevance score (could be enhanced with more sophisticated scoring)
    const score = 1.0 - (matchPos / content.length) // Earlier matches score higher
    
    matches.push({
      snippet,
      position: matchPos,
      score
    })
    
    searchPos = matchPos + 1
    
    // Limit matches to prevent excessive processing
    if (matches.length >= 10) break
  }
  
  return matches.sort((a, b) => b.score - a.score)
}
