/**
 * What-If API - PUT endpoint
 * Updates title, prompt, and/or content of a what-if scenario and automatically calculates word count
 */
import { createServerSupabaseAdminClient } from '../../../lib/supabase'
import type { WhatIfUpdate } from '../../../types/database'

interface UpdateWhatIfRequest {
  title?: string
  prompt?: string
  content?: string
}

interface UpdateWhatIfResponse {
  success: boolean
  whatIf: {
    id: string
    title: string
    prompt: string | null
    content: string | null
    wordCount: number | null
    updatedAt: string
  }
}

export default defineEventHandler(async (event): Promise<UpdateWhatIfResponse> => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const whatIfId = getRouterParam(event, 'id')
    const body = await readBody<UpdateWhatIfRequest>(event)

    if (!whatIfId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'What-If ID is required'
      })
    }

    // Validate request - at least one field must be provided
    if (!body.title && !body.prompt && !body.content) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one field (title, prompt, or content) must be provided'
      })
    }

    // Validate field types if provided
    if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length === 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title must be a non-empty string if provided'
      })
    }

    if (body.prompt !== undefined && body.prompt !== null && (typeof body.prompt !== 'string' || body.prompt.trim().length === 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Prompt must be a non-empty string if provided'
      })
    }

    if (body.content !== undefined && typeof body.content !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Content must be a string if provided'
      })
    }

    // Verify what-if scenario exists
    const { data: existingWhatIf, error: fetchError } = await supabase
      .from('what_ifs')
      .select('id, title, prompt, content, word_count')
      .eq('id', whatIfId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'What-If scenario not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify what-if scenario',
        data: fetchError
      })
    }

    // Prepare update data
    const updateData: WhatIfUpdate = {}

    if (body.title !== undefined) {
      updateData.title = body.title.trim()
    }

    if (body.prompt !== undefined) {
      updateData.prompt = body.prompt ? body.prompt.trim() : null
    }

    if (body.content !== undefined) {
      updateData.content = body.content
      // Calculate word count when content is updated
      updateData.word_count = estimateWordCount(body.content)
    }

    // Update what-if scenario
    const { data: updatedWhatIf, error: updateError } = await supabase
      .from('what_ifs')
      .update(updateData)
      .eq('id', whatIfId)
      .select('id, title, prompt, content, word_count, created_at')
      .single()

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update what-if scenario',
        data: updateError
      })
    }

    return {
      success: true,
      whatIf: {
        id: updatedWhatIf.id,
        title: updatedWhatIf.title,
        prompt: updatedWhatIf.prompt,
        content: updatedWhatIf.content,
        wordCount: updatedWhatIf.word_count,
        updatedAt: new Date().toISOString() // Since we don't have updated_at in what_ifs table
      }
    }

  } catch (error) {
    console.error('Error updating what-if scenario:', error)
    
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

// Helper function to estimate word count with bilingual support
function estimateWordCount(text: string): number {
  const trimmedText = text.trim()
  if (trimmedText.length === 0) return 0
  
  // Take first 100 characters to determine text type
  const sample = trimmedText.substring(0, 100)
  const alphanumericCount = (sample.match(/[a-zA-Z0-9]/g) || []).length
  const alphanumericRatio = alphanumericCount / sample.length
  
  // If more than 50% alphanumeric, treat as English/Western text
  if (alphanumericRatio > 0.5) {
    return trimmedText.split(/\s+/).filter(word => word.length > 0).length
  } else {
    // Treat as Chinese/CJK text - count characters as words
    return trimmedText.length
  }
}
