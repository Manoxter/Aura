'use client'

import { createBrowserClient } from '@supabase/ssr'

// Browser client that stores tokens in COOKIES (not localStorage).
// This allows the middleware to read the session server-side.
// Use this in Client Components instead of the default supabase client.
export function createSupabaseBrowserClient() {
    return createBrowserClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\s/g, ''),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/\s/g, '')
    )
}
