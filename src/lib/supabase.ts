import { createBrowserClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Variáveis públicas — injetadas pelo Next.js no bundle do cliente em build time.
// Fonte de verdade local: .env.development (commitado) ou .env.local (override).
// Nos deploys Vercel: configuradas uma vez via `vercel env add` para os 3 ambientes.
// ---------------------------------------------------------------------------
// strip agressivo: remove TODOS os whitespace (inclui \n embedded do Vercel)
// NEXT_PUBLIC_* são baked em build time — o trim() precisa acontecer antes de qualquer uso
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\s/g, '')
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/\s/g, '')

if (!url || !anonKey) {
    console.error(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes ou em branco.\n' +
        'CAUSA MAIS COMUM: vars configuradas só para Production no Vercel — falta configurar Preview + Development.\n' +
        'Vercel Dashboard → Project → Settings → Environment Variables → marcar os 3 ambientes.\n' +
        'Localmente: confirme que .env.development ou .env.local existem na raiz do projeto.'
    )
}

// ---------------------------------------------------------------------------
// Browser client — usa @supabase/ssr createBrowserClient para armazenar tokens
// em COOKIES (não localStorage). Isso permite que o middleware leia a sessão
// server-side via createServerClient.
//
// IMPORTANTE: importe este arquivo apenas em Client Components ('use client').
// Para Server Components / API routes, use getSupabaseAdmin() ou createServerClient.
// ---------------------------------------------------------------------------
let _supabase: ReturnType<typeof createBrowserClient> | null = null

function getSupabaseBrowserClient() {
    if (!_supabase) {
        _supabase = createBrowserClient(url ?? '', anonKey ?? '')
    }
    return _supabase
}

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
    get(_target, prop) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (getSupabaseBrowserClient() as any)[prop]
    },
})

// ---------------------------------------------------------------------------
// Admin client — usa Service Role Key. APENAS para API routes (server-side).
// Nunca exponha SUPABASE_SERVICE_ROLE_KEY ao cliente.
// ---------------------------------------------------------------------------
export function getSupabaseAdmin(): SupabaseClient {
    return createClient(
        url ?? '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}
