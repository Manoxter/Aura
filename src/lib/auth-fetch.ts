'use client'

import { supabase } from '@/lib/supabase'

/**
 * Fetch wrapper that automatically includes Supabase auth token.
 * Use this for all /api/* calls that require authentication.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    return fetch(url, { ...options, headers })
}
