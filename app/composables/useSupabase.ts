/**
 * Supabase composable for Trickster application
 * Provides reactive Supabase client and utilities
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { useRuntimeConfig } from 'nuxt/app'
import { ref, readonly, onMounted } from 'vue'

export const useSupabase = () => {
  const config = useRuntimeConfig()
  
  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl as string,
    config.public.supabaseAnonKey as string
  )

  // Connection status
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)

  // Test database connection
  const testConnection = async () => {
    try {
      const { error } = await supabase.from('topics').select('count').limit(1)
      if (error) {
        connectionError.value = error.message
        isConnected.value = false
      } else {
        connectionError.value = null
        isConnected.value = true
      }
    } catch (err) {
      connectionError.value = err instanceof Error ? err.message : 'Unknown connection error'
      isConnected.value = false
    }
  }

  // Initialize connection test on first use
  onMounted(() => {
    testConnection()
  })

  return {
    supabase,
    isConnected: readonly(isConnected),
    connectionError: readonly(connectionError),
    testConnection
  }
}
