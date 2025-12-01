/**
 * Supabase client configuration for Trickster
 * Provides both server-side and client-side Supabase clients
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Client-side Supabase client (browser)
export const supabase = createClient<Database>(
  process.env['SUPABASE_URL'] || '',
  process.env['SUPABASE_ANON_KEY'] || ''
)

// Server-side Supabase client (with service role key)
export const supabaseAdmin = createClient<Database>(
  process.env['SUPABASE_URL'] || '',
  process.env['SUPABASE_SERVICE_KEY'] || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Supabase client factory for Nuxt server context
export const createServerSupabaseClient = () => {
  const config = useRuntimeConfig()
  
  return createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey
  )
}

// Supabase admin client factory for Nuxt server context
export const createServerSupabaseAdminClient = () => {
  const config = useRuntimeConfig()
  
  return createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
