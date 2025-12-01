/**
 * LLM service for Trickster application
 * Handles text generation using OpenRouter with OpenAI SDK
 */

import OpenAI from 'openai'
import { logger } from '../../utils/logger'
import { AIServiceError } from '../../utils/errors'

export interface LLMResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  } | undefined
}

export interface StreamingLLMResponse {
  content: string
  finished: boolean
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  } | undefined
}

export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export class LLMService {
  private client: OpenAI
  private defaultModel: string
  private timeout: number

  constructor(apiKey?: string, baseURL?: string) {
    // Try to get runtime config, fallback to process.env if not available
    let configApiKey = ''
    let config: any = null
    try {
      config = useRuntimeConfig()
      configApiKey = config.openrouterApiKey || ''
    } catch {
      configApiKey = process.env['OPENROUTER_API_KEY'] || ''
    }
    
    this.client = new OpenAI({
      apiKey: apiKey || configApiKey,
      baseURL: baseURL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Trickster - AI Imagination Generator'
      }
    })

    // Get default model from config, fallback to hardcoded value
    this.defaultModel = config?.ai?.llm?.defaultModel || 'google/gemini-2.0-flash-001'
    this.timeout = config?.api?.timeout || 30000
  }

  /**
   * Generate text completion (non-streaming)
   */
  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    try {
      logger.debug('Generating LLM completion', {
        model: request.model || this.defaultModel,
        messageCount: request.messages.length,
        temperature: request.temperature
      })

      // Get runtime config for AI settings
      let config: any = null
      try {
        config = useRuntimeConfig()
      } catch {
        // Fallback values if config not available
      }

      const completion = await this.client.chat.completions.create({
        model: request.model || this.defaultModel,
        messages: request.messages,
        temperature: request.temperature || config?.ai?.llm?.defaultTemperature || 0.7,
        max_tokens: request.max_tokens || config?.ai?.llm?.defaultMaxTokens || 1000,
        top_p: config?.ai?.llm?.topP || 0.9,
        stream: false
      })

      const choice = completion.choices[0]
      if (!choice || !choice.message?.content) {
        throw new Error('No content in LLM response')
      }

      logger.debug('LLM completion generated', {
        model: completion.model,
        usage: completion.usage,
        contentLength: choice.message.content.length
      })

      return {
        content: choice.message.content,
        model: completion.model || request.model || this.defaultModel,
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        } : undefined
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LLM error'
      logger.error('LLM completion failed', { error: message, model: request.model })
      throw new AIServiceError(`Failed to generate completion: ${message}`, 'openrouter', error as Error)
    }
  }

  /**
   * Generate streaming text completion with timeout handling
   * Reason: OpenAI streaming sometimes completes without providing finish_reason in the last chunk
   */
  async *generateStreamingCompletion(request: LLMRequest): AsyncGenerator<StreamingLLMResponse, void, unknown> {
    try {
      logger.debug('Starting streaming LLM completion', {
        model: request.model || this.defaultModel,
        messageCount: request.messages.length
      })

      // Get runtime config for AI settings
      let config: any = null
      try {
        config = useRuntimeConfig()
      } catch {
        // Fallback values if config not available
      }

      const stream = await this.client.chat.completions.create({
        model: request.model || this.defaultModel,
        messages: request.messages,
        temperature: request.temperature || config?.ai?.llm?.defaultTemperature || 0.7,
        max_tokens: request.max_tokens || config?.ai?.llm?.defaultMaxTokens || 1000,
        top_p: config?.ai?.llm?.topP || 0.9,
        stream: true
      })

      let fullContent = ''
      let usage: any = undefined
      let lastChunkTime = Date.now()
      let finishReasonReceived = false
      const CHUNK_TIMEOUT_MS = 2000 // 2 seconds timeout

      // Create an async iterator with timeout logic
      const streamWithTimeout = async function* () {
        for await (const chunk of stream) {
          lastChunkTime = Date.now()
          yield chunk
        }
      }

      const iterator = streamWithTimeout()
      let streamEnded = false

      while (!streamEnded) {
        // Create a timeout promise
        const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
          setTimeout(() => resolve({ timeout: true }), CHUNK_TIMEOUT_MS)
        })

        // Race between next chunk and timeout
        const result = await Promise.race([
          iterator.next().then(({ done, value }) => ({ done, value, timeout: false })),
          timeoutPromise
        ])

        if (result.timeout) {
          // Timeout occurred - no new chunks for 2 seconds
          const elapsedSinceLastChunk = Date.now() - lastChunkTime
          
          if (elapsedSinceLastChunk >= CHUNK_TIMEOUT_MS && fullContent.length > 0) {
            logger.debug('Streaming timeout - treating as complete', {
              elapsedSinceLastChunk,
              contentLength: fullContent.length
            })
            
            // Yield final completion chunk
            if (!finishReasonReceived) {
              yield {
                content: '',
                finished: true,
                usage: usage ? {
                  prompt_tokens: usage.prompt_tokens,
                  completion_tokens: usage.completion_tokens,
                  total_tokens: usage.total_tokens
                } : undefined
              }
              finishReasonReceived = true
            }
            streamEnded = true
            break
          }
          continue
        }

        if (result.done) {
          streamEnded = true
          
          // If stream ended without finish_reason, yield final chunk
          if (!finishReasonReceived && fullContent.length > 0) {
            logger.debug('Stream ended without finish_reason - auto-completing', {
              contentLength: fullContent.length
            })
            
            yield {
              content: '',
              finished: true,
              usage: usage ? {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens
              } : undefined
            }
            finishReasonReceived = true
          }
          break
        }

        const chunk = result.value
        if (!chunk) continue
        
        const choice = chunk.choices[0]
        
        if (choice?.delta?.content) {
          const content = choice.delta.content
          fullContent += content
          
          yield {
            content,
            finished: false
          }
        }

        // Check for finish reason and usage
        if (choice?.finish_reason) {
          usage = chunk.usage
          
          yield {
            content: '',
            finished: true,
            usage: usage ? {
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              total_tokens: usage.total_tokens
            } : undefined
          }
          finishReasonReceived = true
          streamEnded = true
        }
      }

      logger.debug('Streaming completion finished', {
        totalLength: fullContent.length,
        usage,
        finishReasonReceived
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown streaming error'
      logger.error('Streaming completion failed', { error: message, model: request.model })
      throw new AIServiceError(`Failed to generate streaming completion: ${message}`, 'openrouter', error as Error)
    }
  }

  /**
   * Generate What-If scenario based on context and prompt
   */
  async generateWhatIfScenario(context: string, prompt: string, language: 'en' | 'zh' = 'en'): Promise<LLMResponse> {
    const systemPrompt = language === 'zh' 
      ? `你是一个创意AI助手，专门帮助用户探索"假如"场景。基于提供的上下文，生成富有想象力和创造性的故事情节。请用中文回答，内容要有趣、引人入胜，并且符合逻辑。`
      : `You are a creative AI assistant specialized in exploring "What if" scenarios. Based on the provided context, generate imaginative and creative storylines. Be engaging, thought-provoking, and maintain logical consistency.`

    const userMessage = language === 'zh'
      ? `基于以下上下文：\n\n${context}\n\n请探索这个"假如"场景：${prompt}`
      : `Based on the following context:\n\n${context}\n\nPlease explore this "What if" scenario: ${prompt}`

    return this.generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8, // Higher temperature for more creativity
      max_tokens: 2000
    })
  }

  /**
   * Generate chat response based on RAG context
   */
  async generateChatResponse(
    messages: Array<{ role: 'user' | 'assistant', content: string }>,
    context: string,
    systemPrompt?: string,
    language: 'en' | 'zh' = 'en'
  ): Promise<LLMResponse> {
    const defaultSystemPrompt = language === 'zh'
      ? `你是一个智能助手，基于提供的上下文回答用户问题。请用中文回答，保持准确、有帮助且友好的语调。如果上下文中没有相关信息，请诚实地说明。`
      : `You are an intelligent assistant that answers questions based on the provided context. Be accurate, helpful, and maintain a friendly tone. If the context doesn't contain relevant information, please say so honestly.`

    const contextMessage = language === 'zh'
      ? `相关上下文信息：\n\n${context}\n\n---\n\n`
      : `Relevant context information:\n\n${context}\n\n---\n\n`

    // Prepend context to the first user message
    const contextualMessages = messages.map((msg, index) => {
      if (index === 0 && msg.role === 'user') {
        return {
          ...msg,
          content: contextMessage + msg.content
        }
      }
      return msg
    })

    return this.generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt || defaultSystemPrompt },
        ...contextualMessages
      ],
      temperature: 0.7
    })
  }

  /**
   * Test LLM service availability and functionality
   */
  async healthCheck(): Promise<{ available: boolean; models?: string[]; error?: string }> {
    try {
      // Test with a simple completion
      const testResponse = await this.generateCompletion({
        messages: [
          { role: 'user', content: 'Hello, please respond with "OK" to confirm you are working.' }
        ],
        model: this.defaultModel,
        max_tokens: 10
      })

      const isWorking = testResponse.content.toLowerCase().includes('ok')

      return {
        available: isWorking,
        ...(isWorking ? {} : { error: 'LLM not responding correctly' })
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        available: false,
        error: `Health check failed: ${message}`
      }
    }
  }

  /**
   * Test bilingual capabilities
   */
  async testBilingualGeneration(): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      const tests = [
        {
          language: 'en' as const,
          prompt: 'What if cats could fly?',
          context: 'In a world where animals have magical abilities.'
        },
        {
          language: 'zh' as const,
          prompt: '假如猫咪会飞会怎样？',
          context: '在一个动物拥有魔法能力的世界里。'
        }
      ]

      const results = []

      for (const test of tests) {
        try {
          const response = await this.generateWhatIfScenario(test.context, test.prompt, test.language)
          results.push({
            language: test.language,
            success: true,
            contentLength: response.content.length,
            usage: response.usage
          })
        } catch (error) {
          results.push({
            language: test.language,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      const successCount = results.filter(r => r.success).length

      return {
        success: successCount > 0,
        results: {
          tests: results,
          successCount,
          totalTests: tests.length
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: `Bilingual test failed: ${message}`
      }
    }
  }
}

// Export singleton instance
export const llmService = new LLMService()
