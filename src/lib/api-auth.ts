import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Validates authentication for API routes.
 * Extracts the Supabase auth token from the Authorization header,
 * verifies it, and returns the authenticated user.
 *
 * Usage in route handlers:
 * ```
 * const auth = await requireAuth(req)
 * if (auth.error) return auth.error
 * const user = auth.user
 * ```
 */
export async function requireAuth(req: Request): Promise<
    { user: { id: string; email?: string }; error?: never } |
    { user?: never; error: NextResponse }
> {
    const authHeader = req.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            error: NextResponse.json(
                { error: 'Autenticacao obrigatoria. Envie o header Authorization: Bearer <token>.' },
                { status: 401 }
            )
        }
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\s/g, ''),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/\s/g, ''),
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
        return {
            error: NextResponse.json(
                { error: 'Token invalido ou expirado.' },
                { status: 401 }
            )
        }
    }

    return { user: { id: user.id, email: user.email } }
}
