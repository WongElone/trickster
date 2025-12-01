/**
 * Content API - Export What-If scenarios
 * Exports What-If content in various formats (JSON, Markdown, Text)
 */
import { createServerSupabaseAdminClient } from '../../../../lib/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = createServerSupabaseAdminClient()
    const query = getQuery(event)
    
    const topicId = query['topicId'] as string
    const format = (query['format'] as string) || 'json'
    const includeContent = query['includeContent'] !== 'false'
    const whatIfIds = query['ids'] ? (query['ids'] as string).split(',') : undefined

    if (!topicId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Topic ID is required'
      })
    }

    if (!['json', 'markdown', 'text'].includes(format)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Format must be one of: json, markdown, text'
      })
    }

    // Verify topic exists
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title, description')
      .eq('id', topicId)
      .single()

    if (topicError) {
      if (topicError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Topic not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify topic',
        data: topicError
      })
    }

    // Get What-If scenarios
    let dbQuery = supabase
      .from('what_ifs')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })

    // Filter by specific IDs if provided
    if (whatIfIds && whatIfIds.length > 0) {
      dbQuery = dbQuery.in('id', whatIfIds)
    }

    const { data: whatIfs, error: whatIfError } = await dbQuery

    if (whatIfError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch What-If scenarios',
        data: whatIfError
      })
    }

    if (!whatIfs || whatIfs.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No What-If scenarios found'
      })
    }

    // Prepare export data
    const exportData = whatIfs.map(whatIf => ({
      id: whatIf.id,
      prompt: whatIf.prompt,
      title: whatIf.title,
      content: includeContent ? whatIf.content : null,
      createdAt: whatIf.created_at,
      wordCount: whatIf.word_count
    }))

    // Generate export based on format
    let exportContent: string
    let contentType: string
    let filename: string

    switch (format) {
      case 'json':
        exportContent = JSON.stringify({
          topic: {
            id: topic.id,
            title: topic.title,
            description: topic.description
          },
          exportedAt: new Date().toISOString(),
          totalScenarios: exportData.length,
          includeContent,
          scenarios: exportData
        }, null, 2)
        contentType = 'application/json'
        filename = `what-if-scenarios-${topic.title.replace(/[^a-zA-Z0-9]/g, '-')}.json`
        break

      case 'markdown':
        exportContent = generateMarkdownExport(topic, exportData, includeContent)
        contentType = 'text/markdown'
        filename = `what-if-scenarios-${topic.title.replace(/[^a-zA-Z0-9]/g, '-')}.md`
        break

      case 'text':
        exportContent = generateTextExport(topic, exportData, includeContent)
        contentType = 'text/plain'
        filename = `what-if-scenarios-${topic.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Unsupported export format'
        })
    }

    // Set response headers for download
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
    setHeader(event, 'Content-Length', Buffer.byteLength(exportContent, 'utf8'))

    return exportContent

  } catch (error) {
    console.error('Error exporting What-If content:', error)
    
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

// Helper function to generate Markdown export
function generateMarkdownExport(topic: any, scenarios: any[], includeContent: boolean): string {
  let markdown = `# What-If Scenarios: ${topic.title}\n\n`
  
  if (topic.description) {
    markdown += `**Topic Description:** ${topic.description}\n\n`
  }
  
  markdown += `**Exported:** ${new Date().toLocaleString()}\n`
  markdown += `**Total Scenarios:** ${scenarios.length}\n\n`
  markdown += `---\n\n`

  scenarios.forEach((scenario, index) => {
    markdown += `## Scenario ${index + 1}: ${scenario.title}\n\n`
    markdown += `**ID:** ${scenario.id}\n`
    markdown += `**Created:** ${new Date(scenario.createdAt).toLocaleString()}\n`
    markdown += `**Word Count:** ${scenario.wordCount || 'Unknown'}\n\n`
    markdown += `**Prompt:** ${scenario.prompt}\n\n`
    
    if (includeContent && scenario.content) {
      markdown += `### Generated Content\n\n`
      markdown += `${scenario.content}\n\n`
    }
    
    markdown += `---\n\n`
  })

  return markdown
}

// Helper function to generate Text export
function generateTextExport(topic: any, scenarios: any[], includeContent: boolean): string {
  let text = `WHAT-IF SCENARIOS: ${topic.title.toUpperCase()}\n`
  text += `${'='.repeat(50)}\n\n`
  
  if (topic.description) {
    text += `Topic Description: ${topic.description}\n\n`
  }
  
  text += `Exported: ${new Date().toLocaleString()}\n`
  text += `Total Scenarios: ${scenarios.length}\n\n`

  scenarios.forEach((scenario, index) => {
    text += `SCENARIO ${index + 1}: ${scenario.title.toUpperCase()}\n`
    text += `${'-'.repeat(30)}\n`
    text += `ID: ${scenario.id}\n`
    text += `Created: ${new Date(scenario.createdAt).toLocaleString()}\n`
    text += `Word Count: ${scenario.wordCount || 'Unknown'}\n\n`
    text += `Prompt: ${scenario.prompt}\n\n`
    
    if (includeContent && scenario.content) {
      text += `Generated Content:\n`
      text += `${scenario.content}\n\n`
    }
    
    text += `${'='.repeat(50)}\n\n`
  })

  return text
}
