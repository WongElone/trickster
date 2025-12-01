/**
 * AI services integration test endpoint
 * Comprehensive testing of all AI components working together
 */

import { aiMonitor } from '../../../lib/ai/ai-monitor'

export default defineEventHandler(async (event) => {
  let testType = 'full'
  try {
    const body = await readBody(event)
    const { testType: bodyTestType = 'full', includePerformance = false } = body
    testType = bodyTestType

    switch (testType) {
      case 'health':
        // Quick health check
        const healthResult = await aiMonitor.checkSystemHealth()
        
        return {
          success: healthResult.overall.healthy,
          data: healthResult,
          message: healthResult.overall.healthy 
            ? 'All AI services are healthy' 
            : 'Some AI services have issues'
        }

      case 'integration':
        // Full integration test
        const integrationResult = await aiMonitor.performIntegrationTest()
        
        return {
          success: integrationResult.success,
          data: integrationResult.results,
          error: integrationResult.error,
          message: integrationResult.success
            ? 'AI services integration test passed'
            : 'AI services integration test failed'
        }

      case 'full':
      default:
        // Comprehensive test including health and integration
        const [health, integration] = await Promise.all([
          aiMonitor.checkSystemHealth(),
          aiMonitor.performIntegrationTest()
        ])

        const overallSuccess = health.overall.healthy && integration.success

        return {
          success: overallSuccess,
          data: {
            health,
            integration: integration.results,
            summary: {
              healthScore: health.overall.score,
              servicesHealthy: health.services.embedding.available && health.services.llm.available,
              integrationPassed: integration.success,
              recommendations: health.recommendations
            }
          },
          message: overallSuccess
            ? 'All AI services are fully operational'
            : 'AI services have issues that need attention'
        }
    }

  } catch (error) {
    console.error('AI integration test failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown integration test error',
      data: {
        timestamp: new Date().toISOString(),
        testType: testType
      },
      message: 'AI integration test encountered an error'
    }
  }
})
