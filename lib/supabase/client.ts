// lib/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase-extended'

export function createClient() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    // isSingleton: false bypasses the cached real-app client (which has a live session).
    // cookies returning undefined/void means createStorageFromOptions builds a storage
    // adapter that always returns null — GoTrue finds no session and never calls
    // _refreshAccessToken, preventing all network calls to Supabase in demo mode.
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        isSingleton: false,
        global: {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      },
    )
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    },
  )
}
