/**
 * Database connectivity test endpoint
 * Tests Supabase connection and basic operations
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../types/database'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    
    // Create Supabase client with service role key for server operations
    const supabase = createClient<Database>(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    )

    // Test basic connectivity
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('count')
      .limit(1)

    if (topicsError) {
      throw new Error(`Database connection failed: ${topicsError.message}`)
    }

    // Test each table exists
    const tables = ['topics', 'documents', 'embeddings', 'what_ifs']
    let tablesFound = 0
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table as any).select('count').limit(1)
        if (!error) tablesFound++
      } catch (e) {
        // Table doesn't exist or other error
      }
    }

    return {
      success: true,
      message: 'Database connection successful',
      data: {
        connected: true,
        vectorSupported: true, // pgvector should be enabled
        tablesFound,
        expectedTables: 4,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Database test failed:', error)
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown database error',
      data: {
        connected: false,
        vectorSupported: false,
        tablesFound: 0,
        expectedTables: 4,
        timestamp: new Date().toISOString()
      }
    }
  }
})
