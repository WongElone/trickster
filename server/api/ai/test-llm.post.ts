/**
 * Test endpoint for LLM service
 * Tests OpenRouter integration with bilingual support
 */

import { llmService } from '../../../lib/ai/llm-service'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { prompt, testType = 'simple', language = 'en', context = '' } = body

    switch (testType) {
      case 'simple':
        // Test simple completion
        if (!prompt) {
          return {
            success: false,
            error: 'Prompt is required for simple test'
          }
        }

        const response = await llmService.generateCompletion({
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
        
        return {
          success: true,
          data: {
            prompt,
            response: response.content,
            model: response.model,
            usage: response.usage
          }
        }

      case 'what-if':
        // Test What-If scenario generation
        if (!prompt) {
          return {
            success: false,
            error: 'Prompt is required for What-If test'
          }
        }

        const whatIfResponse = await llmService.generateWhatIfScenario(
          context || 'In a world where technology and magic coexist.',
          prompt,
          language as 'en' | 'zh'
        )
        
        return {
          success: true,
          data: {
            prompt,
            context,
            language,
            scenario: whatIfResponse.content,
            model: whatIfResponse.model,
            usage: whatIfResponse.usage
          }
        }

      case 'chat':
        // Test chat response with RAG context
        if (!prompt) {
          return {
            success: false,
            error: 'Prompt is required for chat test'
          }
        }

        const chatResponse = await llmService.generateChatResponse(
          [{ role: 'user', content: prompt }],
          context || 'This is test context for the chat response.',
          undefined,
          language as 'en' | 'zh'
        )
        
        return {
          success: true,
          data: {
            prompt,
            context,
            language,
            response: chatResponse.content,
            model: chatResponse.model,
            usage: chatResponse.usage
          }
        }

      case 'bilingual':
        // Test bilingual capabilities
        const bilingualResult = await llmService.testBilingualGeneration()
        
        return {
          success: bilingualResult.success,
          data: bilingualResult.results,
          error: bilingualResult.error
        }

      case 'health':
        // Test service health
        const healthResult = await llmService.healthCheck()
        
        return {
          success: healthResult.available,
          data: healthResult,
          error: healthResult.error
        }

      default:
        return {
          success: false,
          error: 'Invalid test type. Use: simple, what-if, chat, bilingual, or health'
        }
    }

  } catch (error) {
    console.error('LLM test failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown LLM test error',
      data: {
        timestamp: new Date().toISOString()
      }
    }
  }
})
